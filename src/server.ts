import { Express } from 'express';
import { Server as HttpServer } from 'node:http';
import { DataSource } from 'typeorm';
import { createApp } from './app';
import { AuthService } from './application/auth/auth.service';
import { HealthService } from './application/health/health.service';
import { UserService } from './application/users/user.service';
import { AppConfig, loadConfig } from './config';
import { RedisConnection } from './infrastructure/cache/redis.connection';
import { ILoggerService } from './infrastructure/logging/logger.interface';
import { createLogger } from './infrastructure/logging/logger.service';
import { selectUserPersistence } from './infrastructure/persistence/select-user-persistence';
import { PasswordService, TokenService } from './infrastructure/security/security.service';
import { withFibonacciRetry } from './infrastructure/startup/retry.strategy';
import { createRoutes } from './presentation/http/base/routes.factory';
import { logStartupBanner } from './startup-banner';

export interface ServerRuntime {
  readonly loadConfig: typeof loadConfig;
  readonly createLogger: typeof createLogger;
  readonly selectUserPersistence: typeof selectUserPersistence;
  readonly createRedisConnection: (config: AppConfig, logger: ILoggerService) => RedisConnection;
  readonly createApp: typeof createApp;
  readonly retry: typeof withFibonacciRetry;
}

const defaultRuntime: ServerRuntime = {
  loadConfig,
  createLogger,
  selectUserPersistence,
  createRedisConnection: (config, logger) => new RedisConnection(config, logger),
  createApp,
  retry: withFibonacciRetry,
};

export async function bootstrapServer(runtime: ServerRuntime = defaultRuntime): Promise<HttpServer> {
  const config = runtime.loadConfig();
  const logger = runtime.createLogger(config);
  let dataSource: DataSource | undefined;
  let redis: RedisConnection | undefined;

  try {
    const persistence = await runtime.selectUserPersistence(config, runtime.retry, logger);
    dataSource = persistence.dataSource;

    if (config.redis.enabled) {
      redis = runtime.createRedisConnection(config, logger);
      await runtime.retry({
        name: 'Redis',
        target: new URL(config.redis.url).host,
        maxRetries: config.startup.connectRetries,
        baseDelayMs: config.startup.retryDelayMs,
        logger,
        fn: () => redis!.connect(),
      });
    }

    const passwords = new PasswordService(config.security.bcryptRounds);
    const tokens = new TokenService(config.security.jwtSecret, config.security.jwtExpiresInSeconds);

    const routes = createRoutes({
      userService: new UserService(persistence.repository),
      authService: new AuthService(persistence.repository, passwords, tokens),
      healthService: new HealthService(),
      accessTokenService: tokens,
    });

    const app = runtime.createApp({config, logger, routes});
    const server = await listen(app, config.server.port, config.server.host);

    logStartupBanner(config, logger);
    setupShutdownHooks(server, () => closeInfrastructure(redis, dataSource));

    return server;

  } catch (error) {
    await closeInfrastructure(redis, dataSource);
    throw error;
  }
}

const listen = (app: Express, port: number, host: string): Promise<HttpServer> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
    server.once('error', reject);
  });
}

const closeInfrastructure = async (redis?: RedisConnection, dataSource?: DataSource): Promise<void> => {
  const tasks: Promise<unknown>[] = [];

  if (redis) {
    tasks.push(redis.close());
  }

  if (dataSource?.isInitialized) {
    tasks.push(dataSource.destroy());
  }

  await Promise.allSettled(tasks);
};

const setupShutdownHooks = (server: HttpServer, cleanup: () => Promise<void>): void => {
  const shutdown = (signal: NodeJS.Signals): void => {
    process.stderr.write(`Received ${signal}; shutting down gracefully...\n`);
    server.close(() => void cleanup().finally(() => process.exit(0)));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

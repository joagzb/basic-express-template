import { LoggerService } from 'application/shared/logger.service';
import { Server as HttpServer } from 'node:http';
import { DataSource } from 'typeorm';
import { AuthService } from './application/auth/auth.service';
import { UserService } from './application/users/user.service';
import { logStartupBanner } from './startup-banner';
import { AppConfig, loadConfig } from './config';
import { UserRepository } from './domain/users/user.repository';
import { RedisConnection } from './infrastructure/cache/redis.connection';
import { createLogger } from './infrastructure/logging/logger';
import { selectUserPersistence } from './infrastructure/persistence/select-user-persistence';
import { createDefaultDevelopmentAuthCredential } from './infrastructure/security/development-auth.fixture';
import { PasswordService, TokenService } from './infrastructure/security/security.service';
import { DependencyConnector } from './infrastructure/startup/dependency-connector';
import { createApp } from './presentation/http/app';

export class Server {
  public static async start(): Promise<void> {
    const config = loadConfig();
    const logger = createLogger(config);
    const connector = new DependencyConnector(logger);
    const passwords = new PasswordService(config.security.bcryptRounds);
    const tokens = new TokenService(config.security.jwtSecret, config.security.jwtExpiresInSeconds);
    let dataSource: DataSource | undefined;
    let userRepository: UserRepository;
    let redis: RedisConnection | undefined;

    try {
      // initialize persistence
      const persistence = await selectUserPersistence(config, connector);
      dataSource = persistence.dataSource;
      userRepository = persistence.repository;
      
      if (config.redis.enabled) {
        redis = await this.initializeRedis(config, logger, connector);
      }

      // create default development auth credential
      if (config.environment !== 'production') {
        await createDefaultDevelopmentAuthCredential(userRepository, passwords);
      }

    } catch (error) {
      redis?.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
      throw error;
    }

    // run server
    const httpServer = createApp({
      config,
      logger,
      userService: new UserService(userRepository),
      authService: new AuthService(userRepository, passwords, tokens),
      accessTokenService: tokens,
    }).listen(config.server.port, config.server.host, () => {
      logStartupBanner(config, logger);
    });

    Server.registerShutdown(httpServer, async () => {
      redis?.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
    });
  }

  private static async initializeRedis(config: AppConfig, logger: LoggerService, connector: DependencyConnector): Promise<RedisConnection | undefined> {
    const redisConnection = new RedisConnection(config, logger);

    await connector.connect({
      name: 'Redis',
      endpoint: new URL(config.redis.url).host,
      retries: config.startup.connectRetries,
      retryDelayMs: config.startup.retryDelayMs,
      connect: () => redisConnection.connect(),
    });

    return redisConnection;
  }

  private static registerShutdown(httpServer: HttpServer, closeInfrastructure: () => Promise<void>): void {
    const shutdown = (signal: NodeJS.Signals): void => {
      httpServer.close(() => void closeInfrastructure().finally(() => process.exit(0)));
      process.stderr.write(`Received ${signal}; shutting down\n`);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}

import {Express} from 'express';
import {Server as HttpServer} from 'node:http';
import {DataSource} from 'typeorm';
import {createApp} from './app';
import {AuthService} from './application/auth/auth.service';
import {HealthService} from './application/health/health.service';
import {UserService} from './application/users/user.service';
import {AppConfig, loadConfig} from './config';
import {RedisConnection} from './infrastructure/cache/redis.connection';
import {ILoggerService} from './infrastructure/logging/logger.interface';
import {PinoLoggerService} from './infrastructure/logging/logger.service';
import {PersistenceSelection, PersistenceSelector} from './infrastructure/persistence/select-user-persistence';
import {PasswordService, RefreshTokenService, TokenService} from './infrastructure/security/security.service';
import {FibonacciRetryStrategy} from './infrastructure/helpers/retry/retry.strategy';
import {RoutesFactory} from './presentation/http/base/routes.factory';
import {logStartupBanner} from './startup-banner';

export class Server {
  private dataSource: DataSource | undefined;
  private redis: RedisConnection | undefined;

  public async startServer(): Promise<HttpServer> {
    // Load configuration and prepare the infrastructure dependencies once.
    const config = this.loadConfig();
    const logger = this.createLogger(config);

    try {
      // Connect persistence and optional Redis before constructing the app.
      const persistence = await this.initializePersistence(config, logger);
      await this.connectRedis(config, logger);

      // Compose the side-effect-free HTTP pipeline and start listening.
      const app = this.createApplication(config, logger, persistence);
      const httpServer = await this.listen(app, config);

      // Announce readiness only after the listener is active.
      this.logStartupBanner(config, logger);
      this.setupShutdownHooks(httpServer);

      return httpServer;
    } catch (error) {
      await this.closeInfrastructure();
      throw error;
    }
  }

  private loadConfig(): AppConfig {
    return loadConfig();
  }

  private createLogger(config: AppConfig): ILoggerService {
    return new PinoLoggerService(config);
  }

  private async initializePersistence(config: AppConfig, logger: ILoggerService): Promise<PersistenceSelection> {
    const persistence = await new PersistenceSelector(new FibonacciRetryStrategy(), logger).select(config);
    this.dataSource = persistence.dataSource;
    return persistence;
  }

  private async connectRedis(config: AppConfig, logger: ILoggerService): Promise<void> {
    if (!config.redis.enabled) {
      return;
    }

    this.redis = new RedisConnection(config, logger);
    await new FibonacciRetryStrategy().execute({
      name: 'Redis',
      target: new URL(config.redis.url).host,
      maxRetries: config.startup.connectRetries,
      baseDelayMs: config.startup.retryDelayMs,
      logger,
      fn: () => this.redis!.connect(),
    });
  }

  private createApplication(config: AppConfig, logger: ILoggerService, persistence: PersistenceSelection): Express {
    const passwordsService = new PasswordService(config.security.bcryptRounds);
    const tokensService = new TokenService(config.security.jwtSecret, config.security.jwtExpiresInSeconds);
    const refreshTokensService = new RefreshTokenService();
    const sessionsRepository = persistence.authSessionRepository;
    const registrationsRepository = persistence.authRegistrationRepository;
    const usersRepository = persistence.userRepository;
    const routes = new RoutesFactory({
      userService: new UserService(usersRepository),
      authService: new AuthService(
        usersRepository,
        passwordsService,
        tokensService,
        refreshTokensService,
        sessionsRepository,
        registrationsRepository,
        config.security.refreshTokenExpiresInSeconds,
      ),
      healthService: new HealthService(),
      accessTokenService: tokensService,
    }).create();

    return createApp({config, logger, routes});
  }

  private listen(app: Express, config: AppConfig): Promise<HttpServer> {
    return new Promise((resolve, reject) => {
      const httpServer = app.listen(config.server.port, config.server.host, () => {
        httpServer.off('error', reject);
        resolve(httpServer);
      });
      httpServer.once('error', reject);
    });
  }

  private logStartupBanner(config: AppConfig, logger: ILoggerService): void {
    logStartupBanner(config, logger);
  }

  private async closeInfrastructure(): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    if (this.redis) {
      tasks.push(this.redis.close());
    }

    if (this.dataSource?.isInitialized) {
      tasks.push(this.dataSource.destroy());
    }

    await Promise.allSettled(tasks);
  }

  private setupShutdownHooks(httpServer: HttpServer): void {
    const shutdown = (signal: NodeJS.Signals): void => {
      process.stderr.write(`Received ${signal}; shutting down gracefully...\n`);
      httpServer.close(() => void this.closeInfrastructure().finally(() => process.exit(0)));
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}

export const server = new Server();


export const databaseProviders: Record<PersistenceProvider, string> = {
  [PersistenceProvider.POSTGRES]: 'postgres',
  [PersistenceProvider.MEMORY]: 'in-memory',
};

export interface StartupBanner {
  readonly app: string;
  readonly version: string;
  readonly environment: AppConfig['environment'];
  readonly persistence: AppConfig['persistence']['provider'];
  readonly database: string;
  readonly redis: 'enabled' | 'disabled';
}

export const logStartupBanner = (config: AppConfig, logger: LoggerService): void => {
  const banner: StartupBanner = {
    app: config.app.name,
    version: config.app.version,
    environment: config.environment,
    persistence: config.persistence.provider,
    database: databaseProviders[config.persistence.provider],
    redis: config.redis.enabled ? 'enabled' : 'disabled',
  };

  logger.info(banner, 'Application started');
};

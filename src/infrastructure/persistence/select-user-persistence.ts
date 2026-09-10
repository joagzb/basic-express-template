import {DataSource} from 'typeorm';
import {AppConfig, PersistenceProvider} from '../../config';
import {UserRepository} from '../../domain/users/user.repository';
import {LoggerService} from '../logging/logger.interface';
import {RetryStrategy} from '../startup/retry.strategy';
import {InMemoryUserRepository} from './memory/in-memory-user.repository';
import {createPostgresDataSource} from './postgres/data-source';
import {TypeOrmUserRepository} from './postgres/typeorm-user.repository';
import {UserEntity} from './postgres/user.entity';

export interface UserPersistence {
  readonly repository: UserRepository;
  readonly dataSource?: DataSource;
}

type PersistenceFactory = (config: AppConfig, retry: RetryStrategy, logger: LoggerService, dataSourceFactory: typeof createPostgresDataSource) => Promise<UserPersistence>;

const persistenceFactories: Record<PersistenceProvider, PersistenceFactory> = {
  [PersistenceProvider.MEMORY]: async () => ({repository: new InMemoryUserRepository()}),
  [PersistenceProvider.POSTGRES]: async (config, retry, logger, dataSourceFactory) => {
    const dataSource = dataSourceFactory(config);
    try {
      await retry({
        name: 'PostgreSQL',
        target: `${config.postgres.host}:${config.postgres.port}`,
        maxRetries: config.startup.connectRetries,
        baseDelayMs: config.startup.retryDelayMs,
        logger,
        fn: async () => void (await dataSource.initialize()),
      });
      return {repository: new TypeOrmUserRepository(dataSource.getRepository(UserEntity)), dataSource};
    } catch (error) {
      if (dataSource.isInitialized) await dataSource.destroy();
      throw error;
    }
  },
};

export const selectUserPersistence = async (
  config: AppConfig,
  retry: RetryStrategy,
  logger: LoggerService,
  dataSourceFactory: typeof createPostgresDataSource = createPostgresDataSource,
): Promise<UserPersistence> => {
  return persistenceFactories[config.persistence.provider](config, retry, logger, dataSourceFactory);
};

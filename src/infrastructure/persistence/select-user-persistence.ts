import {DataSource} from 'typeorm';
import {AppConfig, PersistenceProvider} from '../../config';
import {IAuthRegistrationRepository, IAuthSessionRepository} from '../../domain/auth/auth';
import {IUserRepository} from '../../domain/users/user.repository';
import {ILoggerService} from '../logging/logger.interface';
import {RetryStrategy} from '../startup/retry.strategy';
import {InMemoryAuthRegistrationRepository} from './memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from './memory/in-memory-auth-session.repository';
import {InMemoryPersistenceState} from './memory/in-memory-persistence.state';
import {InMemoryUserRepository} from './memory/in-memory-user.repository';
import {createPostgresDataSource} from './postgres/data-source';
import {UserEntity} from './postgres/entities/user.entity';
import {TypeOrmAuthRegistrationRepository} from './postgres/repositories/typeorm-auth-registration.repository';
import {TypeOrmAuthSessionRepository} from './postgres/repositories/typeorm-auth-session.repository';
import {TypeOrmUserRepository} from './postgres/repositories/typeorm-user.repository';

export interface PersistenceSelection {
  readonly userRepository: IUserRepository;
  readonly authSessionRepository: IAuthSessionRepository;
  readonly authRegistrationRepository: IAuthRegistrationRepository;
  readonly dataSource?: DataSource;
}

type PersistenceFactory = (config: AppConfig, retry: RetryStrategy, logger: ILoggerService, dataSourceFactory: typeof createPostgresDataSource) => Promise<PersistenceSelection>;

const persistenceFactories: Record<PersistenceProvider, PersistenceFactory> = {
  [PersistenceProvider.MEMORY]: async () => {
    const state = new InMemoryPersistenceState();
    return {
      userRepository: new InMemoryUserRepository(state),
      authSessionRepository: new InMemoryAuthSessionRepository(state),
      authRegistrationRepository: new InMemoryAuthRegistrationRepository(state),
    };
  },
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
      return {
        userRepository: new TypeOrmUserRepository(dataSource.getRepository(UserEntity)),
        authSessionRepository: new TypeOrmAuthSessionRepository(dataSource),
        authRegistrationRepository: new TypeOrmAuthRegistrationRepository(dataSource),
        dataSource,
      };
    } catch (error) {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      throw error;
    }
  },
};

export const selectPersistence = async (
  config: AppConfig,
  retry: RetryStrategy,
  logger: ILoggerService,
  dataSourceFactory: typeof createPostgresDataSource = createPostgresDataSource,
): Promise<PersistenceSelection> => {
  return persistenceFactories[config.persistence.provider](config, retry, logger, dataSourceFactory);
};

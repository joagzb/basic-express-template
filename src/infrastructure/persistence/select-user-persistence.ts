import {DataSource} from 'typeorm';
import {AppConfig, PersistenceProvider} from '../../config';
import {IAuthRegistrationRepository, IAuthSessionRepository} from '../../domain/auth/auth';
import {IUserRepository} from '../../domain/users/user.repository';
import {ILoggerService} from '../logging/logger.interface';
import {RetryStrategy} from '../helpers/retry/retry.strategy';
import {InMemoryAuthRegistrationRepository} from './memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from './memory/in-memory-auth-session.repository';
import {InMemoryPersistenceState} from './memory/in-memory-persistence.state';
import {InMemoryUserRepository} from './memory/in-memory-user.repository';
import {PostgresDataSourceFactory} from './postgres/data-source';
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

interface DataSourceFactory {
  create(config: AppConfig): DataSource;
}

type PersistenceFactory = (config: AppConfig) => Promise<PersistenceSelection>;

export class PersistenceSelector {
  private readonly persistenceFactories: Record<PersistenceProvider, PersistenceFactory>;

  public constructor(
    private readonly retry: RetryStrategy,
    private readonly logger: ILoggerService,
    private readonly dataSourceFactory: DataSourceFactory = new PostgresDataSourceFactory(),
  ) {
    this.persistenceFactories = {
      [PersistenceProvider.MEMORY]: async () => {
        const state = new InMemoryPersistenceState();
        return {
          userRepository: new InMemoryUserRepository(state),
          authSessionRepository: new InMemoryAuthSessionRepository(state),
          authRegistrationRepository: new InMemoryAuthRegistrationRepository(state),
        };
      },
      [PersistenceProvider.POSTGRES]: config => this.createPostgresPersistence(config),
    };
  }

  public select(config: AppConfig): Promise<PersistenceSelection> {
    return this.persistenceFactories[config.persistence.provider](config);
  }

  private async createPostgresPersistence(config: AppConfig): Promise<PersistenceSelection> {
    const dataSource = this.dataSourceFactory.create(config);
    try {
      await this.retry.execute({
        name: 'PostgreSQL',
        target: `${config.postgres.host}:${config.postgres.port}`,
        maxRetries: config.startup.connectRetries,
        baseDelayMs: config.startup.retryDelayMs,
        logger: this.logger,
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
  }
}

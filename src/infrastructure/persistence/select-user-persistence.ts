import {DataSource} from 'typeorm';
import {AppConfig, PersistenceProvider} from '../../config';
import {UserRepository} from '../../domain/users/user.repository';
import {DependencyConnector} from '../startup/dependency-connector';
import {InMemoryUserRepository} from './memory/in-memory-user.repository';
import {createPostgresDataSource} from './postgres/data-source';
import {TypeOrmUserRepository} from './postgres/typeorm-user.repository';
import {UserEntity} from './postgres/user.entity';

export interface UserPersistence {
  readonly repository: UserRepository;
  readonly dataSource?: DataSource;
}

type PersistenceFactory = (config: AppConfig, connector: DependencyConnector, dataSourceFactory: typeof createPostgresDataSource) => Promise<UserPersistence>;

const persistenceFactories: Record<PersistenceProvider, PersistenceFactory> = {
  [PersistenceProvider.MEMORY]: async () => ({repository: new InMemoryUserRepository()}),
  [PersistenceProvider.POSTGRES]: async (config, connector, dataSourceFactory) => {
    const dataSource = dataSourceFactory(config);
    await connector.connect({
      name: 'PostgreSQL',
      endpoint: `${config.postgres.host}:${config.postgres.port}`,
      retries: config.startup.connectRetries,
      retryDelayMs: config.startup.retryDelayMs,
      connect: async () => void (await dataSource.initialize()),
    });
    return {repository: new TypeOrmUserRepository(dataSource.getRepository(UserEntity)), dataSource};
  },
};

export const selectUserPersistence = async (
  config: AppConfig,
  connector: DependencyConnector,
  dataSourceFactory: typeof createPostgresDataSource = createPostgresDataSource,
): Promise<UserPersistence> => {
  return persistenceFactories[config.persistence.provider](config, connector, dataSourceFactory);
};

import {DataSource, Repository} from 'typeorm';
import {parseConfig, PersistenceProvider} from '../config';
import {createLogger} from '../infrastructure/logging/logger';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {selectUserPersistence} from '../infrastructure/persistence/select-user-persistence';
import {TypeOrmUserRepository} from '../infrastructure/persistence/postgres/typeorm-user.repository';
import {UserEntity} from '../infrastructure/persistence/postgres/user.entity';
import {DependencyConnector} from '../infrastructure/startup/dependency-connector';

describe('user persistence provider selection', () => {
  test('defaults to PostgreSQL without silently falling back', async () => {
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent'});
    const dataSourceFactory = jest.fn(() => {
      throw new Error('postgres unavailable');
    });

    await expect(selectUserPersistence(config, new DependencyConnector(createLogger(config)), dataSourceFactory)).rejects.toThrow('postgres unavailable');
    expect(config.persistence.provider).toBe(PersistenceProvider.POSTGRES);
    expect(dataSourceFactory).toHaveBeenCalledTimes(1);
  });

  test('memory does not create or initialize PostgreSQL', async () => {
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent', PERSISTENCE_PROVIDER: PersistenceProvider.MEMORY});
    const dataSourceFactory = jest.fn();
    const connector = new DependencyConnector(createLogger(config));

    const persistence = await selectUserPersistence(config, connector, dataSourceFactory);

    expect(persistence.repository).toBeInstanceOf(InMemoryUserRepository);
    expect(persistence.dataSource).toBeUndefined();
    expect(dataSourceFactory).not.toHaveBeenCalled();
  });

  test('postgres initializes the datasource and selects TypeORM', async () => {
    const ormRepository = {} as Repository<UserEntity>;
    const dataSource = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockReturnValue(ormRepository),
    } as unknown as DataSource;
    const dataSourceFactory = jest.fn().mockReturnValue(dataSource);
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent', PERSISTENCE_PROVIDER: PersistenceProvider.POSTGRES});
    const connector = new DependencyConnector(createLogger(config));

    const persistence = await selectUserPersistence(config, connector, dataSourceFactory);

    expect(dataSourceFactory).toHaveBeenCalledWith(config);
    expect(dataSource.initialize).toHaveBeenCalledTimes(1);
    expect(dataSource.getRepository).toHaveBeenCalledWith(UserEntity);
    expect(persistence.repository).toBeInstanceOf(TypeOrmUserRepository);
    expect(persistence.dataSource).toBe(dataSource);
  });
});

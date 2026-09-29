import {DataSource, Repository} from 'typeorm';
import {parseConfig, PersistenceProvider} from '../config';
import {createLogger} from '../infrastructure/logging/logger.service';
import {InMemoryAuthRegistrationRepository} from '../infrastructure/persistence/memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {AuthSessionEntity} from '../infrastructure/persistence/postgres/entities/auth-session.entity';
import {UserEntity} from '../infrastructure/persistence/postgres/entities/user.entity';
import {TypeOrmAuthRegistrationRepository} from '../infrastructure/persistence/postgres/repositories/typeorm-auth-registration.repository';
import {TypeOrmAuthSessionRepository} from '../infrastructure/persistence/postgres/repositories/typeorm-auth-session.repository';
import {TypeOrmUserRepository} from '../infrastructure/persistence/postgres/repositories/typeorm-user.repository';
import {selectPersistence} from '../infrastructure/persistence/select-user-persistence';
import {withFibonacciRetry} from '../infrastructure/startup/retry.strategy';

describe('user persistence provider selection', () => {
  test('defaults to PostgreSQL without silently falling back', async () => {
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent'});
    const dataSourceFactory = jest.fn(() => {
      throw new Error('postgres unavailable');
    });

    await expect(selectPersistence(config, withFibonacciRetry, createLogger(config), dataSourceFactory)).rejects.toThrow('postgres unavailable');
    expect(config.persistence.provider).toBe(PersistenceProvider.POSTGRES);
    expect(dataSourceFactory).toHaveBeenCalledTimes(1);
  });

  test('memory does not create or initialize PostgreSQL', async () => {
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent', PERSISTENCE_PROVIDER: PersistenceProvider.MEMORY});
    const dataSourceFactory = jest.fn();

    const persistence = await selectPersistence(config, withFibonacciRetry, createLogger(config), dataSourceFactory);

    expect(persistence.userRepository).toBeInstanceOf(InMemoryUserRepository);
    expect(persistence.authSessionRepository).toBeInstanceOf(InMemoryAuthSessionRepository);
    expect(persistence.authRegistrationRepository).toBeInstanceOf(InMemoryAuthRegistrationRepository);
    expect((persistence.userRepository as InMemoryUserRepository).state).toBe((persistence.authSessionRepository as InMemoryAuthSessionRepository).state);
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

    const persistence = await selectPersistence(config, withFibonacciRetry, createLogger(config), dataSourceFactory);

    expect(dataSourceFactory).toHaveBeenCalledWith(config);
    expect(dataSource.initialize).toHaveBeenCalledTimes(1);
    expect(dataSource.getRepository).toHaveBeenCalledWith(UserEntity);
    expect(persistence.userRepository).toBeInstanceOf(TypeOrmUserRepository);
    expect(persistence.authSessionRepository).toBeInstanceOf(TypeOrmAuthSessionRepository);
    expect(persistence.authRegistrationRepository).toBeInstanceOf(TypeOrmAuthRegistrationRepository);
    expect(persistence.dataSource).toBe(dataSource);
    expect(dataSource.getRepository).not.toHaveBeenCalledWith(AuthSessionEntity);
  });

  test('destroys an initialized datasource when repository construction fails', async () => {
    const failure = new Error('repository unavailable');
    const dataSource = {
      isInitialized: true,
      initialize: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn(() => {
        throw failure;
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataSource;
    const config = parseConfig({NODE_ENV: 'test', LOG_LEVEL: 'silent', PERSISTENCE_PROVIDER: PersistenceProvider.POSTGRES});

    await expect(selectPersistence(config, withFibonacciRetry, createLogger(config), () => dataSource)).rejects.toBe(failure);
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });
});

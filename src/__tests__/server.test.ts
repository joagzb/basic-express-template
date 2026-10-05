import {Express} from 'express';
import {EventEmitter} from 'node:events';
import {Server as HttpServer} from 'node:http';
import {DataSource} from 'typeorm';
import * as appModule from '../app';
import * as configModule from '../config';
import {testConfig} from '../config/test-config';
import {RedisConnection} from '../infrastructure/cache/redis.connection';
import {InMemoryAuthRegistrationRepository} from '../infrastructure/persistence/memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';
import {InMemoryPersistenceState} from '../infrastructure/persistence/memory/in-memory-persistence.state';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {PersistenceSelector} from '../infrastructure/persistence/select-user-persistence';
import {Server} from '../server';

jest.mock('../infrastructure/cache/redis.connection');

const createMemoryPersistence = (dataSource?: DataSource) => {
  const state = new InMemoryPersistenceState();
  return {
    userRepository: new InMemoryUserRepository(state),
    authSessionRepository: new InMemoryAuthSessionRepository(state),
    authRegistrationRepository: new InMemoryAuthRegistrationRepository(state),
    dataSource,
  };
};

describe('Server startup lifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts with Redis disabled and constructs the app once', async () => {
    const httpServer = new EventEmitter() as unknown as HttpServer;
    Object.assign(httpServer, {close: jest.fn()});
    const app = {
      listen: jest.fn((_port: number, _host: string, listening: () => void) => {
        void Promise.resolve().then(listening);
        return httpServer;
      }),
    } as unknown as Express;
    const createApp = jest.spyOn(appModule, 'createApp').mockReturnValue(app);
    const selectPersistence = jest.spyOn(PersistenceSelector.prototype, 'select').mockResolvedValue(createMemoryPersistence());
    jest.spyOn(configModule, 'loadConfig').mockReturnValue(testConfig);
    const processOnce = jest.spyOn(process, 'once').mockReturnValue(process);

    await expect(new Server().startServer()).resolves.toBe(httpServer);

    expect(selectPersistence).toHaveBeenCalledTimes(1);
    expect(createApp).toHaveBeenCalledTimes(1);
    processOnce.mockRestore();
  });

  test('connects optional Redis without using it for User or Auth composition', async () => {
    const config = {...testConfig, redis: {...testConfig.redis, enabled: true}};
    const httpServer = new EventEmitter() as unknown as HttpServer;
    Object.assign(httpServer, {close: jest.fn()});
    const app = {
      listen: jest.fn((_port: number, _host: string, listening: () => void) => {
        void Promise.resolve().then(listening);
        return httpServer;
      }),
    } as unknown as Express;
    const connect = jest.fn().mockResolvedValue(undefined);
    const redis = {
      connect,
      close: jest.fn().mockResolvedValue(undefined),
      get service(): never {
        throw new Error('RedisService must not be consumed by User or Auth composition');
      },
    } as unknown as RedisConnection;
    const RedisConnectionMock = RedisConnection as jest.MockedClass<typeof RedisConnection>;
    RedisConnectionMock.mockImplementation(() => redis);
    const selectPersistence = jest.spyOn(PersistenceSelector.prototype, 'select').mockResolvedValue(createMemoryPersistence());
    const createApp = jest.spyOn(appModule, 'createApp').mockReturnValue(app);
    jest.spyOn(configModule, 'loadConfig').mockReturnValue(config);
    const processOnce = jest.spyOn(process, 'once').mockReturnValue(process);

    await expect(new Server().startServer()).resolves.toBe(httpServer);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(selectPersistence).toHaveBeenCalledWith(config);
    expect(createApp).toHaveBeenCalledTimes(1);
    processOnce.mockRestore();
  });

  test('cleans initialized dependencies when the HTTP listener fails', async () => {
    const failure = new Error('address already in use');
    const httpServer = new EventEmitter() as unknown as HttpServer;
    const app = {
      listen: jest.fn(() => {
        void Promise.resolve().then(() => httpServer.emit('error', failure));
        return httpServer;
      }),
    } as unknown as Express;
    const destroy = jest.fn().mockResolvedValue(undefined);
    const dataSource = {isInitialized: true, destroy} as unknown as DataSource;
    jest.spyOn(configModule, 'loadConfig').mockReturnValue(testConfig);
    jest.spyOn(PersistenceSelector.prototype, 'select').mockResolvedValue(createMemoryPersistence(dataSource));
    jest.spyOn(appModule, 'createApp').mockReturnValue(app);

    await expect(new Server().startServer()).rejects.toBe(failure);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test('retains and closes Redis when all connection attempts fail', async () => {
    const config = {...testConfig, redis: {...testConfig.redis, enabled: true}};
    const connect = jest.fn().mockRejectedValue(new Error('connection refused'));
    const close = jest.fn();
    const redis = {connect, close} as unknown as RedisConnection;
    const RedisConnectionMock = RedisConnection as jest.MockedClass<typeof RedisConnection>;
    RedisConnectionMock.mockImplementation(() => redis);
    const destroy = jest.fn().mockResolvedValue(undefined);
    const dataSource = {isInitialized: true, destroy} as unknown as DataSource;
    const createHttpApp = jest.spyOn(appModule, 'createApp');
    jest.spyOn(configModule, 'loadConfig').mockReturnValue(config);
    jest.spyOn(PersistenceSelector.prototype, 'select').mockResolvedValue(createMemoryPersistence(dataSource));

    await expect(new Server().startServer()).rejects.toThrow('Redis connection to test-redis:6379 failed after 2 attempts: connection refused');
    expect(connect).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(createHttpApp).not.toHaveBeenCalled();
  });
});

import {Express} from 'express';
import {EventEmitter} from 'node:events';
import {Server as HttpServer} from 'node:http';
import {DataSource} from 'typeorm';
import {createApp} from '../app';
import {testConfig} from '../config/test-config';
import {RedisConnection} from '../infrastructure/cache/redis.connection';
import {createLogger} from '../infrastructure/logging/logger.service';
import {InMemoryAuthRegistrationRepository} from '../infrastructure/persistence/memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';
import {InMemoryPersistenceState} from '../infrastructure/persistence/memory/in-memory-persistence.state';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {withFibonacciRetry} from '../infrastructure/startup/retry.strategy';
import {bootstrapServer, ServerRuntime} from '../server';

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
    const runtime: ServerRuntime = {
      loadConfig: () => config,
      createLogger,
      selectPersistence: async () => createMemoryPersistence(),
      createRedisConnection: () => redis,
      createApp: jest.fn(() => app) as unknown as typeof createApp,
      retry: withFibonacciRetry,
    };
    const processOnce = jest.spyOn(process, 'once').mockReturnValue(process);

    await expect(bootstrapServer(runtime)).resolves.toBe(httpServer);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(runtime.createApp).toHaveBeenCalledTimes(1);
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
    const runtime: ServerRuntime = {
      loadConfig: () => testConfig,
      createLogger,
      selectPersistence: async () => createMemoryPersistence(dataSource),
      createRedisConnection: jest.fn() as unknown as ServerRuntime['createRedisConnection'],
      createApp: jest.fn(() => app) as unknown as typeof createApp,
      retry: withFibonacciRetry,
    };

    await expect(bootstrapServer(runtime)).rejects.toBe(failure);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test('retains and closes Redis when all connection attempts fail', async () => {
    const config = {...testConfig, redis: {...testConfig.redis, enabled: true}};
    const connect = jest.fn().mockRejectedValue(new Error('connection refused'));
    const close = jest.fn();
    const redis = {connect, close} as unknown as RedisConnection;
    const destroy = jest.fn().mockResolvedValue(undefined);
    const dataSource = {isInitialized: true, destroy} as unknown as DataSource;
    const createHttpApp = jest.fn() as unknown as typeof createApp;
    const runtime: ServerRuntime = {
      loadConfig: () => config,
      createLogger,
      selectPersistence: async () => createMemoryPersistence(dataSource),
      createRedisConnection: () => redis,
      createApp: createHttpApp,
      retry: withFibonacciRetry,
    };

    await expect(bootstrapServer(runtime)).rejects.toThrow('Redis connection to test-redis:6379 failed after 2 attempts: connection refused');
    expect(connect).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(createHttpApp).not.toHaveBeenCalled();
  });
});

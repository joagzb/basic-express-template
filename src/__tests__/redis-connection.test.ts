import {createClient} from 'redis';
import {testConfig} from '../config/test-config';
import {RedisConnection} from '../infrastructure/cache/redis.connection';
import {createLogger} from '../infrastructure/logging/logger.service';

jest.mock('redis', () => ({...jest.requireActual('redis'), createClient: jest.fn()}));

describe('RedisConnection', () => {
  test('delegates generic service commands to the owned shared Redis client', async () => {
    const client = {
      isOpen: true,
      isReady: true,
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(true),
      ttl: jest.fn().mockResolvedValue(-2),
    };
    jest.mocked(createClient).mockReturnValue(client as never);

    const connection = new RedisConnection(testConfig, createLogger(testConfig));
    await connection.service.set('project:1', {name: 'Example'});
    await expect(connection.service.get('project:1')).resolves.toBeNull();
    await connection.close();

    expect(client.set).toHaveBeenCalledWith('project:1', '{"name":"Example"}', undefined);
    expect(client.get).toHaveBeenCalledWith('project:1');
    expect(client.close).toHaveBeenCalledTimes(1);
  });

  test('connects the shared command client', async () => {
    const client = {
      isOpen: false,
      isReady: false,
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(createClient).mockReturnValue(client as never);

    const connection = new RedisConnection(testConfig, createLogger(testConfig));
    await connection.connect();

    expect(client.connect).toHaveBeenCalledTimes(1);
  });
});

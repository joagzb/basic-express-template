import {createClient} from 'redis';
import {testConfig} from '../config/test-config';
import {RedisConnection} from '../infrastructure/cache/redis.connection';
import {createLogger} from '../infrastructure/logging/logger.service';

jest.mock('redis', () => ({createClient: jest.fn()}));

describe('RedisConnection', () => {
  test('delegates service readiness and commands to the owned Redis client', async () => {
    const client = {
      isOpen: true,
      isReady: true,
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
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
    await connection.close();

    expect(client.set).toHaveBeenCalledWith('project:1', '{"name":"Example"}', undefined);
    expect(client.quit).toHaveBeenCalledTimes(1);
  });
});

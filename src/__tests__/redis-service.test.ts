import {RedisSerializationError, RedisService, RedisUnavailableError} from '../infrastructure/cache/redis.service';

type RedisClientMock = {
  isReady: boolean;
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
};

const createClient = (): RedisClientMock => ({
  isReady: true,
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(0),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(false),
  ttl: jest.fn().mockResolvedValue(-2),
});

describe('RedisService', () => {
  test('serializes JSON values and supports set and put with optional TTLs', async () => {
    const client = createClient();
    const redis = new RedisService(client);

    await redis.set('user:1', {name: 'Ada', roles: ['admin']}, 60);
    await redis.put('feature:enabled', true);

    expect(client.set).toHaveBeenNthCalledWith(1, 'user:1', '{"name":"Ada","roles":["admin"]}', {EX: 60});
    expect(client.set).toHaveBeenNthCalledWith(2, 'feature:enabled', 'true', undefined);
  });

  test('deserializes values and distinguishes a missing key', async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce('{"name":"Ada"}').mockResolvedValueOnce(null);
    const redis = new RedisService(client);

    await expect(redis.get('user:1')).resolves.toEqual({name: 'Ada'});
    await expect(redis.get('missing')).resolves.toBeNull();
  });

  test('provides boolean key operations and Redis expiry inspection semantics', async () => {
    const client = createClient();
    client.del.mockResolvedValue(1);
    client.exists.mockResolvedValue(1);
    client.expire.mockResolvedValue(true);
    client.ttl.mockResolvedValue(45);
    const redis = new RedisService(client);

    await expect(redis.delete('user:1')).resolves.toBe(true);
    await expect(redis.exists('user:1')).resolves.toBe(true);
    await expect(redis.expire('user:1', 60)).resolves.toBe(true);
    await expect(redis.ttl('user:1')).resolves.toBe(45);
  });

  test('reports disabled and disconnected clients instead of hiding unavailable Redis', async () => {
    await expect(new RedisService().get('key')).rejects.toThrow(RedisUnavailableError);
    await expect(new RedisService().get('key')).rejects.toThrow('Redis is disabled');

    const client = createClient();
    Object.defineProperty(client, 'isReady', {value: false});
    await expect(new RedisService(client).get('key')).rejects.toThrow('client is not connected');
  });

  test('rejects invalid values and propagates Redis command failures', async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce('not-json').mockResolvedValueOnce('null').mockRejectedValueOnce(new Error('connection lost'));
    const redis = new RedisService(client);

    await expect(redis.get('invalid')).rejects.toThrow(RedisSerializationError);
    await expect(redis.get('null')).rejects.toThrow(RedisSerializationError);
    await expect(redis.get('failed')).rejects.toThrow('connection lost');
    await expect(redis.set('', 'value')).rejects.toThrow('Redis key must not be empty');
    await expect(redis.expire('key', 0)).rejects.toThrow('Redis TTL must be a positive integer in seconds');
  });
});

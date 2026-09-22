import {KeyValue, RedisOperations} from './redis.interface';

export interface RedisCommandClient {
  readonly isReady: boolean;
  set(key: string, value: string, options?: {EX: number}): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean | number>;
  ttl(key: string): Promise<number>;
  eval(script: string, options: {keys: string[]; arguments: string[]}): Promise<unknown>;
}

export class RedisUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'RedisUnavailableError';
  }
}

export class RedisSerializationError extends Error {
  public constructor(key: string, options?: ErrorOptions) {
    super(`Redis value for key "${key}" is not valid JSON`, options);
    this.name = 'RedisSerializationError';
  }
}

export class RedisService implements RedisOperations {
  public constructor(
    private readonly client?: RedisCommandClient,
    private readonly unavailableReason = 'Redis is disabled',
  ) {}

  public async set(key: string, value: KeyValue, ttlSeconds?: number): Promise<void> {
    this.assertKey(key);
    if (ttlSeconds !== undefined) {
      this.assertTtl(ttlSeconds);
    }
    const serialized = JSON.stringify(value);
    const client = this.readyClient();
    await client.set(key, serialized, ttlSeconds === undefined ? undefined : {EX: ttlSeconds});
  }

  public put(key: string, value: KeyValue, ttlSeconds?: number): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  public async get(key: string): Promise<KeyValue | null> {
    this.assertKey(key);
    const value = await this.readyClient().get(key);
    if (value === null) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as KeyValue | null;
      if (parsed === null) {
        throw new TypeError('Top-level null is reserved for missing keys');
      }
      return parsed;
    } catch (error) {
      throw new RedisSerializationError(key, {cause: error});
    }
  }

  public update(key: string, value: KeyValue, ttlSeconds?: number): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  public async delete(key: string): Promise<boolean> {
    this.assertKey(key);
    return (await this.readyClient().del(key)) > 0;
  }

  public async exists(key: string): Promise<boolean> {
    this.assertKey(key);
    return (await this.readyClient().exists(key)) > 0;
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    this.assertKey(key);
    this.assertTtl(ttlSeconds);
    return Boolean(await this.readyClient().expire(key, ttlSeconds));
  }

  public ttl(key: string): Promise<number> {
    this.assertKey(key);
    return this.readyClient().ttl(key);
  }

  public async compareDigestAndReplace(
    key: string,
    expectedDigest: string,
    value: KeyValue,
    ttlSeconds: number,
  ): Promise<{readonly status: 'updated'; readonly userId: string} | {readonly status: 'missing' | 'mismatch'}> {
    this.assertKey(key);
    this.assertTtl(ttlSeconds);
    const result = await this.readyClient().eval(COMPARE_DIGEST_AND_REPLACE_SCRIPT, {
      keys: [key],
      arguments: [expectedDigest, JSON.stringify(value), String(ttlSeconds)],
    });
    if (!Array.isArray(result) || typeof result[0] !== 'string') {
      throw new RedisSerializationError(key);
    }
    if (result[0] === 'updated' && typeof result[1] === 'string') {
      return {status: 'updated', userId: result[1]};
    }
    if (result[0] === 'missing' || result[0] === 'mismatch') {
      return {status: result[0]};
    }
    throw new RedisSerializationError(key);
  }

  private readyClient(): RedisCommandClient {
    if (!this.client) {
      throw new RedisUnavailableError(this.unavailableReason);
    }
    if (!this.client.isReady) {
      throw new RedisUnavailableError('Redis is unavailable because the client is not connected');
    }
    return this.client;
  }

  private assertKey(key: string): void {
    if (key.trim().length === 0) {
      throw new TypeError('Redis key must not be empty');
    }
  }

  private assertTtl(ttlSeconds: number): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new TypeError('Redis TTL must be a positive integer in seconds');
    }
  }
}

const COMPARE_DIGEST_AND_REPLACE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then
  return {'missing'}
end
local decoded = cjson.decode(current)
if decoded.refreshTokenDigest ~= ARGV[1] then
  redis.call('DEL', KEYS[1])
  return {'mismatch'}
end
local replacement = cjson.decode(ARGV[2])
replacement.id = decoded.id
replacement.userId = decoded.userId
replacement.createdAt = decoded.createdAt
redis.call('SET', KEYS[1], cjson.encode(replacement), 'EX', ARGV[3])
return {'updated', decoded.userId}
`;

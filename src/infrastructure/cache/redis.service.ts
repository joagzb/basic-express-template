import {KeyValue, KeyValueStore} from '../../application/shared/key-value-store';

export interface RedisCommandClient {
  readonly isReady: boolean;
  set(key: string, value: string, options?: {EX: number}): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean | number>;
  ttl(key: string): Promise<number>;
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

export class RedisService implements KeyValueStore {
  public constructor(
    private readonly client?: RedisCommandClient,
    private readonly unavailableReason = 'Redis is disabled',
  ) {}

  public async set(key: string, value: KeyValue, ttlSeconds?: number): Promise<void> {
    this.assertKey(key);
    if (ttlSeconds !== undefined) this.assertTtl(ttlSeconds);
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
    if (value === null) return null;

    try {
      const parsed = JSON.parse(value) as KeyValue | null;
      if (parsed === null) throw new TypeError('Top-level null is reserved for missing keys');
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

  private readyClient(): RedisCommandClient {
    if (!this.client) throw new RedisUnavailableError(this.unavailableReason);
    if (!this.client.isReady) throw new RedisUnavailableError('Redis is unavailable because the client is not connected');
    return this.client;
  }

  private assertKey(key: string): void {
    if (key.trim().length === 0) throw new TypeError('Redis key must not be empty');
  }

  private assertTtl(ttlSeconds: number): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) throw new TypeError('Redis TTL must be a positive integer in seconds');
  }
}

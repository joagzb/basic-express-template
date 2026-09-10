import { createClient, RedisClientType } from 'redis';
import { AppConfig } from '../../config';
import { LoggerService } from '../logging/logger.interface';
import { RedisCommandClient, RedisService } from './redis.service';

export class RedisConnection {
  private readonly client: RedisClientType;
  public readonly service: RedisService;

  public constructor(config: AppConfig, logger: LoggerService) {
    this.client = createClient({
      url: config.redis.url,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: config.redis.connectTimeoutMs,
        reconnectStrategy: false, // Disables internal reconnection loop in favor of your startup retry strategy
      },
    });

    this.client.on('error', (error: Error) => logger.error({error}, 'Redis client error'));

    const client = this.client;
    const commands: RedisCommandClient = {
      get isReady() {
        return client.isReady;
      },
      set: (key, value, options) => client.set(key, value, options),
      get: key => client.get(key),
      del: key => client.del(key),
      exists: key => client.exists(key),
      expire: (key, ttlSeconds) => client.expire(key, ttlSeconds),
      ttl: key => client.ttl(key),
    };
    this.service = new RedisService(commands);
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}

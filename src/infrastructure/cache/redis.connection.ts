import {createClient, RedisClientType} from 'redis';
import {AppConfig} from '../../config';
import {ILoggerService} from '../logging/logger.interface';
import {RedisService} from './redis.service';

/**
 * Owns the node-redis client lifecycle and passes the client directly to
 * `RedisService` for future application consumers.
 *
 * Flow: node-redis client -> `RedisService` -> `IRedisOperations` consumers.
 *
 * This keeps connection lifecycle and raw node-redis semantics below the
 * application-facing serialization, TTL, and error boundary.
 */
export class RedisConnection {
  private readonly client: RedisClientType;
  public readonly service: RedisService;

  public constructor(config: AppConfig, logger: ILoggerService) {
    const clientOptions = {
      url: config.redis.url,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: config.redis.connectTimeoutMs,
        reconnectStrategy: false, // Disables internal reconnection loop in favor of your startup retry strategy
      },
    } as const;

    this.client = createClient(clientOptions);

    this.client.on('error', (error: Error) => logger.error({error}, 'Redis client error'));
    this.service = new RedisService(this.client);
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }
}

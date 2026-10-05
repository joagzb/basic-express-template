export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};
export type KeyValue = Exclude<JsonValue, null>;

/**
 * Generic Redis operations available to future application consumers.
 *
 * `RedisService` implements JSON serialization, TTL handling, boolean command
 * results, and availability/error behavior behind this contract. Application
 * code should depend on this interface rather than node-redis types.
 */
export interface IRedisOperations {
  set(key: string, value: KeyValue, ttlSeconds?: number): Promise<void>;
  put(key: string, value: KeyValue, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<KeyValue | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
}

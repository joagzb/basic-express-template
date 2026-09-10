export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};
export type KeyValue = Exclude<JsonValue, null>;

export interface RedisOperations {
  set(key: string, value: KeyValue, ttlSeconds?: number): Promise<void>;
  put(key: string, value: KeyValue, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<KeyValue | null>;
  update(key: string, value: KeyValue, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
}

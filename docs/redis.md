# Redis integration

Set these values in the active environment file:

```dotenv
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

When enabled, `src/server.ts` connects Redis before opening the HTTP listener and closes it during shutdown. Redis is disabled by default. The development Compose stack can start a local Redis service for you.

## Available operations

`RedisService` implements `IRedisOperations` with JSON values:

| Operation               | Result                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `set(key, value, ttl?)` | Store a non-null JSON value, optionally with a positive TTL.         |
| `put(key, value, ttl?)` | Alias for `set`.                                                     |
| `get(key)`              | Return the parsed value, or `null` when the key is missing.          |
| `delete(key)`           | Delete a key and report whether it existed.                          |
| `exists(key)`           | Report whether a key exists.                                         |
| `expire(key, ttl)`      | Apply a positive TTL and report whether it was applied.              |
| `ttl(key)`              | Return seconds remaining, `-1` without expiry, or `-2` when missing. |

Keys must be non-empty. TTL values must be positive integers in seconds. Invalid stored JSON raises a serialization error.

## Failure behavior

- Startup fails when Redis is enabled but cannot be reached after the configured retries.
- Operations raise `RedisUnavailableError` when Redis is disabled or disconnected.

A future consumer must choose its own policy. Derived data such as a cache may fail open; authoritative state usually must fail closed.

## Add a future consumer

1. Depend on `IRedisOperations`, not node-redis types.
2. Put feature-specific key naming and behavior in its own adapter.
3. Construct that adapter in `src/server.ts` and inject it into the owning service.
4. Document whether Redis is derived or authoritative for that feature.
5. Add deterministic unit tests; keep live Redis tests opt-in.

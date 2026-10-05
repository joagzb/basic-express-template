# Architecture

The template uses four layers and an explicit composition root. Dependencies point toward application and domain contracts; concrete frameworks and services stay at the edges.

## Dependency direction

```text
HTTP request
    |
presentation -> application -> domain
                       ^          ^
                       |          |
                  infrastructure adapters
                       ^
                       |
                 server.ts composition
```

| Area             | Owns                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| `domain`         | Business models and inward-facing repository or security contracts.                 |
| `application`    | Use cases, DTOs, manual validation, and application errors.                         |
| `infrastructure` | Memory and TypeORM repositories, PostgreSQL, Redis, Pino, JWT, and bcrypt adapters. |
| `presentation`   | Express controllers, routes, middleware, and OpenAPI.                               |
| `src/server.ts`  | Configuration, provider selection, dependency construction, startup, and shutdown.  |

Domain and application code should not depend on Express, TypeORM, node-redis, or environment configuration.

## Presentation convention

`HttpMiddleware` owns the application-level middleware callbacks, `RoutesFactory` composes route definitions from already-constructed services, and `OpenApiDocument` creates the OpenAPI document from runtime configuration. Route classes, controllers, and authentication middleware follow the same instance-oriented boundary. Their callback properties are stable and correctly bound before Express receives them, so async controller error forwarding, middleware ordering, and HTTP contracts remain unchanged.

This is a project convention for exported presentation responsibilities, not a claim that functions are architecturally invalid. Small private pure helpers, such as OpenAPI body shaping and error-body construction, remain functions when that keeps the implementation clearer. `createApp()` remains the HTTP assembly boundary: it registers middleware, routes, documentation, and terminal error handlers, but does not open listeners or connect external services.

## Composition files

| File                                           | Responsibility                                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.ts`                                   | Creates Express, installs global middleware, mounts injected routes and Swagger, then adds not-found and error handlers. It does not connect services or open a listener.        |
| `src/presentation/http/base/routes.factory.ts` | `RoutesFactory` turns already-constructed application services into controllers, middleware, and route definitions.                                                              |
| `src/server.ts`                                | Loads configuration, selects persistence, optionally connects Redis, constructs services, starts the HTTP listener, and closes infrastructure during shutdown or failed startup. |

The normal request path is:

```text
route -> middleware -> controller -> application service -> repository contract -> selected adapter
```

## Persistence selection

`PERSISTENCE_PROVIDER` selects one coherent persistence bundle in `select-user-persistence.ts`:

| Provider   | Users                         | Auth sessions                 | Registration                                       |
| ---------- | ----------------------------- | ----------------------------- | -------------------------------------------------- |
| `memory`   | In-process repository         | In-process repository         | One synchronous commit over shared in-memory state |
| `postgres` | TypeORM/PostgreSQL repository | TypeORM/PostgreSQL repository | One TypeORM transaction using its EntityManager    |

Memory data is process-local, non-durable, and not shared across app instances or restarts. PostgreSQL stores both users and sessions durably. Auth services depend on `IUserRepository`, `IAuthSessionRepository`, and the narrow `IAuthRegistrationRepository` atomic operation, so they do not know which provider was selected.

Registration prepares the credential and initial session in `AuthService`, then delegates both writes to the selected provider. PostgreSQL obtains both entity repositories from the transaction `EntityManager`; a session-write failure rolls back the credential insert. The memory adapter checks duplicates and prepares both records before synchronously publishing one shared state update.

TypeORM entities and relation metadata live under `src/infrastructure/persistence/postgres/entities`. Domain files retain only framework-independent models and ports.

## Redis boundary

Redis is independent of user and auth-session persistence:

```text
node-redis client
      |
RedisConnection  (connection lifecycle)
      |
RedisService     (JSON, TTL, and error behavior)
      |
IRedisOperations (contract for future consumers)
```

When `REDIS_ENABLED=true`, `src/server.ts` connects `RedisConnection` before listening and closes it during shutdown. `RedisService` exposes `set`, `put`, `get`, `delete`, `exists`, `expire`, and `ttl` through `IRedisOperations`.

No endpoint cache or Redis-backed auth session is currently wired. User and auth requests use the selected memory or PostgreSQL repositories directly. See [Redis integration](redis.md) before adding a consumer.

## Extending the template

- [Add an endpoint set](adding-endpoints.md)
- [Add HTTP middleware safely](middlewares.md)
- [Review known limitations](known-limitations.md)

Keep unit tests independent of live services. Use `createApp()` for HTTP contract tests and keep PostgreSQL or Redis integration tests opt-in.

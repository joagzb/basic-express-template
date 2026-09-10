# Architecture

This template uses four explicit layers: `domain`, `application`, `infrastructure`, and `presentation`. The layers separate business concepts and use cases from Express, TypeORM, Redis, and process startup so that external providers can be replaced without rewriting application behavior.

## Dependency direction

Source dependencies point toward the domain:

```text
presentation ──> application ──> domain
infrastructure ─────────────────────> domain

bootstrap/composition ──> presentation + application + infrastructure
```

- `domain` does not import Express, TypeORM, Redis, configuration, or another layer.
- `application` imports domain models and contracts and may own narrow outbound ports for technical capabilities. It does not know which database, cache client, logger, or HTTP framework is used.
- `infrastructure` implements domain contracts and owns external technology such as TypeORM, PostgreSQL, Redis, Pino, JWT, and bcrypt.
- `presentation` translates HTTP requests and responses and delegates use-case work to the Application Service Layer.
- `bootstrap` is the composition root. It may reference every layer because its job is to select implementations, inject dependencies, start the process, and release resources.
- `config` converts environment variables into typed settings used at the outer boundaries.

The important boundary is the repository interface. `UserService` depends on `UserRepository`, which belongs to the domain. Both persistence adapters implement that contract. The application therefore does not depend on either adapter.

## The four layers

### Domain

`src/domain` contains stable business concepts and contracts:

- `users/user.ts` defines `User`, `NewUser`, and `UserUpdate`.
- `users/user.repository.ts` defines the persistence operations required by the user feature.

Keep this layer framework-free. A domain type must not carry TypeORM decorators, Express request types, environment access, or provider configuration. Add business rules here when they can be expressed independently of delivery and storage technology.

### Application: Service Layer

`src/application` contains the **Service Layer**: classes that expose application use cases and coordinate domain contracts.

`UserService` receives a `UserRepository` through its constructor. It implements user operations and age calculation without knowing whether data is kept in PostgreSQL or memory. Repository-backed controller operations call this service rather than calling persistence directly. The HTTP behavior of each included endpoint is described below.

Use “Service Layer” for this role. A service is not a generic utility bucket and is not an Express handler. It represents application behavior, owns use-case orchestration, and depends inward on domain contracts.

### Infrastructure

`src/infrastructure` contains replaceable technical implementations:

- `persistence/postgres` owns the TypeORM data source, entity, migration, and PostgreSQL repository adapter.
- `persistence/memory` owns the process-local repository adapter used when memory persistence is explicitly selected.
- `persistence/select-user-persistence.ts` selects and initializes the configured user repository.
- `cache` owns the Redis client lifecycle and implements the application-facing `KeyValueStore` port.
- `logging` wraps Pino behind the injectable application-facing `LoggerService` port.
- `security` wraps password hashing and JWT operations.
- `startup` provides retry-aware external dependency connection logic.

Infrastructure may depend on domain and application-owned contracts to implement them. Domain and application code must not import an infrastructure adapter.

### Shared application ports and infrastructure services

`src/application/shared` defines small provider-independent ports for capabilities that application services may need. `KeyValueStore` exposes JSON key/value operations, and `LoggerService` exposes structured log levels. Application code receives these contracts by constructor injection; it never imports `redis`, Pino, `RedisService`, or `PinoLoggerService`.

`RedisService` implements `KeyValueStore`. `set`, `put`, and `update` JSON-serialize strings, numbers, booleans, arrays, and objects; `get` parses that JSON and returns `null` when the key is absent. `update` has Redis `SET` overwrite semantics and creates a missing key. Supplying no TTL removes any previous expiration, matching Redis `SET`; `expire` adds expiration separately. `delete`, `exists`, and `expire` return booleans. `ttl` preserves Redis values: seconds remaining, `-1` for no expiration, and `-2` for a missing key. Keys must be non-empty and TTL values must be positive integer seconds.

`RedisConnection` exclusively owns `connect()` and `close()`, keeps the node-redis client private, and exposes its `RedisService`. Bootstrap only creates and connects it when Redis is enabled. A disabled service or a service whose client is not ready throws `RedisUnavailableError`; command failures propagate to the caller. This avoids both accidental offline queuing and silent cache failure. Tests inject a narrow mocked command client and require no live Redis.

`PinoLoggerService` implements `LoggerService` with `trace`, `debug`, `info`, `warn`, `error`, and `fatal`. Each method accepts either a message or structured context followed by an optional message. Context provided as `{error: Error}` is mapped to Pino's standard `err` field so type, message, and stack remain structured. Redaction stays centralized. HTTP request logging, error middleware, startup, Redis, and dependency connection code consume `LoggerService`, so consumers neither import Pino nor create logger instances. Tests may inject a simple writable destination.

### Presentation

`src/presentation` contains delivery concerns. The current delivery mechanism is HTTP through Express:

- routes map URL paths and methods;
- controllers validate request DTOs (`body`, `params`, and `query`) with Zod and validate response DTOs before data crosses the HTTP boundary;
- controllers translate HTTP input into Service Layer calls and build HTTP responses;
- middleware handles validation, not-found responses, errors, request logging, and shared HTTP policy;
- `app.ts` creates the Express application and registers middleware and routes without opening a network listener;
- `openapi.ts` builds the Swagger/OpenAPI document.

Controllers should remain thin. Business decisions belong in the Service Layer or domain, not in route callbacks or HTTP response mapping.

## Repository-backed request flow

A repository-backed user request follows this path:

```text
HTTP request
  -> Express middleware
  -> route and Zod validation
  -> UserController
  -> UserService (Application Service Layer)
  -> UserRepository contract
  -> selected PostgreSQL or memory adapter
  -> Zod response validation
  -> controller response
  -> HTTP response
```

For example, `POST /api/user` is validated by `createUserRequestDtoSchema`, handled by `UserController.create`, mapped from `CreateUserRequestDto` to the framework-independent `NewUser` input, delegated to `UserService.create`, and persisted by the injected `UserRepository`. Errors are forwarded to the final HTTP error middleware.

Authentication follows the same explicit path: `AuthController.login` maps `LoginRequestDto` into application credentials, `AuthService.login` queries `UserRepository.findCredentialByEmail`, and the selected memory or TypeORM repository performs the lookup. The service then verifies the password and issues a token through domain security contracts implemented by infrastructure services. Controllers never access repositories or ORM APIs directly, and application services never import Express.

### Current user HTTP behavior

The example API exposes collection listing and persistence operations, while some item operations return acknowledgements rather than persisted records:

- `GET /api/users` calls `UserService.findAll` and returns every user from the selected repository. `GET /api/user` is not registered.
- `POST /api/user` calls `UserService.create`, persists the user, and returns the created record inside `{function: 'create', data}`.
- `GET /api/user/:id` calls `UserService.findById` and returns `{function: 'getById', id}` using the persisted user identifier, or a `USER_NOT_FOUND` error when no matching record exists.
- `PATCH /api/user/:id` validates the body and calls `UserService.update`, then returns `{function: 'update'}` regardless of whether a matching record was found.
- `DELETE /api/user/:id` calls `UserService.delete`, then returns `{function: 'delete'}` regardless of whether a matching record was found.

The service and repository expose `findById`, `update`, and `delete`. The lookup endpoint reports a missing record, while PATCH and DELETE preserve acknowledgement-only compatibility responses. Returning full records or adding not-found behavior to those mutation endpoints remains a future public HTTP contract extension.

`createApp()` only composes HTTP concerns. It does not connect to PostgreSQL or Redis and does not call `listen()`, which keeps HTTP tests deterministic.

## Current source tree

```text
src/
├── domain/
│   └── users/
│       ├── user.ts
│       └── user.repository.ts
├── application/
│   ├── shared/
│   │   ├── key-value-store.ts
│   │   └── logger.service.ts
│   └── users/
│       └── user.service.ts
├── infrastructure/
│   ├── cache/
│   │   ├── redis.connection.ts
│   │   └── redis.service.ts
│   ├── logging/
│   │   └── logger.ts
│   ├── persistence/
│   │   ├── memory/
│   │   │   └── in-memory-user.repository.ts
│   │   ├── postgres/
│   │   │   ├── migrations/create-users-table.ts
│   │   │   ├── data-source.ts
│   │   │   ├── typeorm-user.repository.ts
│   │   │   └── user.entity.ts
│   │   └── select-user-persistence.ts
│   ├── security/
│   │   └── security.service.ts
│   └── startup/
│       └── dependency-connector.ts
├── presentation/
│   └── http/
│       ├── errors/app-error.ts
│       ├── health/
│       │   ├── health.controller.ts
│       │   ├── health.routes.ts
│       │   └── health.dto.ts
│       ├── middleware/http.middleware.ts
│       ├── users/
│       │   ├── user.controller.ts
│       │   ├── user.routes.ts
│       │   └── user.dto.ts
│       ├── app.ts
│       └── openapi.ts
├── config/
│   ├── app.config.ts
│   ├── config.types.ts
│   ├── database.config.ts
│   ├── env.ts
│   ├── index.ts
│   └── redis.config.ts
├── bootstrap/
│   ├── server.ts
│   └── startup-banner.ts
├── testing/
│   └── test-config.ts
├── __tests__/
│   ├── app.test.ts
│   ├── dependency-connector.test.ts
│   ├── environment.test.ts
│   ├── infrastructure.integration.test.ts
│   ├── logger-service.test.ts
│   ├── persistence-provider.test.ts
│   ├── redis-service.test.ts
│   ├── security-services.test.ts
│   ├── user-repository.test.ts
│   └── user-service.test.ts
└── index.ts
```

## Folder-by-folder purpose

| Folder               | Purpose                                                                | Avoid                                                           |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/domain`         | Business models and provider-independent contracts                     | Framework imports and storage entities                          |
| `src/application`    | Application Service Layer and use-case orchestration                   | Express responses, TypeORM repositories, raw environment access |
| `src/infrastructure` | External adapters and technical services                               | HTTP response policy and application use cases                  |
| `src/presentation`   | HTTP validation, routing, controllers, middleware, and OpenAPI         | Direct database access and business rules                       |
| `src/config`         | Manual typed environment parsing and semantic configuration modules    | Ad hoc `process.env` reads elsewhere                            |
| `src/bootstrap`      | Provider selection, dependency injection, listener lifecycle, shutdown | Business logic                                                  |
| `src/testing`        | Reusable deterministic test configuration                              | Production composition                                          |
| `src/__tests__`      | Unit, HTTP, provider-selection, startup, and opt-in integration tests  | Hidden production behavior                                      |

## Repository and provider switching

PostgreSQL is the default persistence provider. `PersistenceProvider` in `config.types.ts` is the source-of-truth enum, and `PERSISTENCE_PROVIDER` is manually parsed into one of its values:

- `postgres` — creates a TypeORM `DataSource`, connects with retry handling, runs explicit migrations, and injects `TypeOrmUserRepository`.
- `memory` — explicitly selects `InMemoryUserRepository`; it requires no database and loses all data when the process stops.

For a database-backed local run, keep:

```dotenv
PERSISTENCE_PROVIDER=postgres
```

For a quick process-local run or deterministic adapter usage, set:

```dotenv
PERSISTENCE_PROVIDER=memory
REDIS_ENABLED=false
```

Provider behavior and presentation are both enum-backed mappings:

- `persistenceFactories` is an exhaustive `Record<PersistenceProvider, PersistenceFactory>` that selects the adapter and lifecycle behavior.
- `databaseLabels` is an exhaustive `Record<PersistenceProvider, string>` that supplies the startup banner's human-readable database mode.

Keeping both mappings keyed by `PersistenceProvider` makes extension explicit: adding an enum member creates a TypeScript error until its factory and display label are defined. Provider selection never leaks into the Service Layer or controller. To add another provider:

1. Add its value to `PersistenceProvider`.
2. Implement `UserRepository` in `src/infrastructure/persistence/<provider>`.
3. Add its factory to `persistenceFactories` and its display label to `databaseLabels`; TypeScript reports either missing mapping because both records are exhaustive.
4. Update environment examples, `src/__tests__/environment.test.ts`, `src/__tests__/persistence-provider.test.ts`, and provider-specific lifecycle cleanup when applicable.

Do not add provider string comparisons or provider conditionals to `UserService` or controllers.

Redis is independent of persistence. `REDIS_ENABLED=true` enables its startup connection; selecting memory persistence does not automatically change Redis. Application services that need caching should accept `KeyValueStore` and receive `redisConnection.service` from bootstrap after the connection succeeds.

## Environment configuration

Configuration is loaded once during startup:

1. `config/index.ts` loads `.env.<NODE_ENV>` and then `.env`.
2. `config/env.ts` directly parses strings, integers, booleans, enums/allowed values, defaults, ranges, and formats. Unknown or invalid supported values fail startup.
3. `app.config.ts` maps application, server, startup, logging, persistence, and security settings.
4. `database.config.ts` maps PostgreSQL settings.
5. `redis.config.ts` maps Redis settings and builds its connection URL.
6. `config.types.ts` defines the semantic `AppConfig` consumed by the outer layers.

Use `.env.development.example`, `.env.test.example`, and `.env.production.example` as templates. Do not commit real secrets.

Environment configuration intentionally does **not** use Zod. Its fixed, process-owned input is parsed once in `env.ts` into `ParsedEnvironment` and then mapped to `AppConfig`; coercion and startup errors remain explicit without coupling configuration to HTTP DTO tooling. When adding configuration, extend `ParsedEnvironment`, `parseEnvironment()`, the relevant typed module, its example environment files, and environment tests together. Avoid reading `process.env` from domain, application, presentation, or infrastructure feature classes.

## Boundary and model validation

Zod belongs at HTTP and other external data boundaries. Every endpoint defines a request DTO schema covering `body`, `params`, and `query`, including explicit empty-object schemas when an endpoint accepts no values. Controllers parse these values before passing clean, framework-independent input to the Service Layer. Validation errors report each issue with its full DTO path (for example, `body.surname`) through the shared error envelope, including an ISO timestamp and structured issue details. Every endpoint also defines a response DTO schema; `sendValidatedResponse()` parses the payload before Express serializes it. Apply the same pattern when consuming untrusted messages, webhooks, files, or third-party API payloads.

DTO schemas are transport contracts, not domain models or persistence entities. Map validated DTOs into domain/application inputs and validate business invariants in the domain or Service Layer. TypeORM metadata and database constraints remain necessary as the final persistence integrity boundary, but they do not replace DTO or domain validation: they run too late, cannot describe every HTTP shape or business invariant, produce storage-oriented errors, and do not validate outbound responses or non-database providers. Each boundary has a distinct job:

- Zod protects external request and response contracts.
- Domain/Application Service Layer validation protects business invariants regardless of transport or provider.
- TypeORM and database constraints protect persisted data against invalid writes and concurrency races.

## Startup and the banner

`src/index.ts` is the process entry point. `Server.start()` performs startup in this order:

1. load and validate configuration;
2. create the injectable logger service and dependency connector;
3. select and initialize the persistence provider;
4. connect Redis only when enabled;
5. construct `UserService` with the selected repository;
6. inject the service into `createApp()` and open the HTTP listener;
7. log the startup banner;
8. register graceful `SIGINT` and `SIGTERM` cleanup.

The structured startup banner reports application name and version, environment, selected persistence, effective database mode (`postgres` or `in-memory`), and Redis state. It intentionally does not log the full configuration or secrets. Startup failures are written to stderr and leave a non-zero exit code.

## Add a new feature

Use one vertical slice across the four layers rather than creating a self-contained module that mixes them:

1. **Domain:** create `src/domain/<feature>` models and repository contracts.
2. **Application:** create `src/application/<feature>/<feature>.service.ts` for Service Layer use cases.
3. **Infrastructure:** add adapters under `src/infrastructure`, such as memory and PostgreSQL repositories, entities, and migrations.
4. **Presentation:** add Zod request and response DTO schemas, a controller, and routes under `src/presentation/http/<feature>`.
5. **Composition:** select providers and instantiate the service in `src/bootstrap/server.ts`; inject it into `createApp()` and register routes explicitly.
6. **Tests:** test the Service Layer with an injected fake or memory adapter, test the HTTP contract through `createApp()` without listening, and test provider selection separately.
7. **Documentation:** update OpenAPI and this tree when the public API or architecture changes.

Keep each dependency visible in constructors. Do not use global service locators or make the application layer import a concrete adapter.

## Add a new library

Before adding a package, identify which boundary owns it:

1. Confirm that the capability is not already provided by the current stack.
2. Place framework or vendor usage in `infrastructure` or `presentation`, not in `domain`.
3. Hide replaceable provider APIs behind a domain contract or a narrow application-facing interface when application behavior depends on them.
4. Pass configuration through `AppConfig`; do not let the library read environment variables throughout the codebase.
5. Instantiate and inject the library from `bootstrap` when it has lifecycle or provider concerns.
6. Add deterministic tests that do not require a live external service unless the test is explicitly an integration test.
7. Update `package-lock.json`, relevant documentation, and production-hardening notes.

Use `npm run check` to validate formatting, linting, types, and tests after a change. Use Docker/Compose verification only when the change specifically requires container or live-provider validation.

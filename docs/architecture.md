# Architecture

The User feature is the source-of-truth example for this four-layer template. Requests move through explicit routes and thin controllers into framework-independent application services.

## Dependency direction

```text
presentation -> application -> domain
infrastructure -> application + domain
server -> presentation + application + infrastructure
```

| Layer            | Owns                                                                 | Must not depend on                                 |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `domain`         | Business models and repository/security contracts                    | Express, TypeORM, Redis, environment configuration |
| `application`    | Use cases, DTOs, validators, shared inward ports, application errors | Express or concrete adapters                       |
| `infrastructure` | TypeORM, PostgreSQL, Redis, Pino, JWT, bcrypt                        | HTTP response policy                               |
| `presentation`   | Express controllers, routes, middleware, OpenAPI                     | TypeORM, Redis clients, business orchestration     |
| `src/server.ts`  | Provider selection and dependency injection                          | Feature behavior                                   |

## Reference flow: User

```text
UserRoutes
  -> AuthenticationMiddleware
  -> UserController
  -> UserService
  -> UserValidator
  -> IUserRepository
  -> optional Redis cache-aside repository decorator
  -> memory or TypeORM adapter
  -> Redis cache plus process memory or PostgreSQL
```

- `src/domain/users/user.ts` defines persisted domain shapes.
- `src/domain/users/user.repository.ts` defines the inward-facing `IUserRepository` persistence port.
- `src/application/users/user.dto.ts` defines create and update use-case inputs.
- `src/application/users/user.validator.ts` manually validates and normalizes typed DTO fields without a validation framework.
- `src/application/shared/validators/common.validator.ts` provides the shared calendar-date and email format checks used by feature validators.
- `src/application/users/user.service.ts` rejects invalid DTOs before calling the repository.
- `src/presentation/http/users/user.controller.ts` extracts `body` or `params`, delegates, selects status codes, and forwards errors.
- `src/presentation/http/users/user.routes.ts` defines the protected `/users` endpoints.

Application DTOs are not persistence entities. They describe one use case and may map into domain types after validation. Their concrete validators are application-owned use-case policy, not repository or external-service ports. Domain models remain stable and framework-independent; TypeORM metadata stays in infrastructure.

## Auth and Health

Auth mirrors User with `auth.dto.ts`, `auth.validator.ts`, `AuthService`, `AuthController`, and `AuthRoutes`. The controller passes DTO-shaped bodies to the service; the service rejects malformed fields before persistence. Password, access-token, refresh-token, and session behavior are inward-owned contracts implemented by infrastructure and injected into `AuthService`.

Login and registration create independent Redis sessions, so one user may be signed in on multiple clients. Each response contains a short-lived JWT access token with explicit `access` intent and a session id, plus an opaque refresh token. Redis stores only the refresh-token SHA-256 digest with the session id, user id, creation/rotation timestamps, expiry timestamp, and TTL. Refresh uses one Lua compare-and-replace operation: a matching digest rotates the token and TTL; a mismatch deletes the session as reuse. Logout reads the session id from the verified access token and revokes only that session. User-route authentication remains stateless JWT verification and does not check Redis.

Health has no repository. `HealthService` constructs `HealthDto`; `HealthController` only maps it to HTTP; `HealthRoutes` declares `/health/ping`.

## Composition and errors

`src/server.ts` selects persistence, connects optional Redis, constructs services, and calls `createRoutes()`. User and Auth services expose typed application DTO contracts and own their concrete manual validators so values are checked before repository calls. The logger contract is implemented by Pino under `src/infrastructure/logging/`; the composition root and HTTP middleware receive it through dependency injection. `src/app.ts` mounts injected route definitions, OpenAPI, not-found handling, and the final error middleware. It never connects external services or opens a listener.

Application validation throws `ValidationError`. Controllers forward errors with `next(error)`, and HTTP middleware maps known errors to stable JSON responses while sanitizing unexpected failures.

## Persistence providers

`PersistenceProvider` is the exhaustive provider enum. `select-user-persistence.ts` maps each provider to an `IUserRepository` adapter and lifecycle resources. The current memory and TypeORM/PostgreSQL adapters are interchangeable behind that port. A future JSON-file adapter would require only infrastructure implementation, provider configuration, and composition changes. Provider strings and adapter selection must not appear in services, validators, or controllers.

PostgreSQL is the runtime default. Its TypeORM data source runs registered migrations on startup with `synchronize: false`; email and password-hash columns remain nullable PostgreSQL `varchar` fields so users created outside registration remain valid. Memory persistence is explicit, process-local, and non-durable.

Redis is independent of authoritative persistence. When enabled, `src/server.ts` connects it before opening the HTTP listener, decorates the selected `IUserRepository`, and injects a Redis session adapter behind the domain session contract. `findAll` and `findById` use namespaced cache-aside keys with `USER_CACHE_TTL_SECONDS`; successful user and credential writes invalidate collection and affected-id keys. Cache errors are logged and fail open, preserving repository reads and writes.

Session operations fail closed. With Redis disabled, startup remains available and user persistence runs without caching, but auth operations that create, rotate, or revoke sessions surface `503 AUTH_SESSIONS_UNAVAILABLE`. This explicit mode keeps local and test startup deterministic without claiming that durable sessions exist. Tests inject an in-memory session fake; production composition uses Redis. Access and refresh lifetimes are configured independently with `JWT_EXPIRES_IN_SECONDS` and `REFRESH_TOKEN_EXPIRES_IN_SECONDS`.

## Verification

Unit-test validators and services without Express. Test HTTP contracts through `createApp()` without opening a listener. The default test configuration selects memory persistence and disables Redis; keep live PostgreSQL and Redis tests opt-in.

```bash
npm run check
npm run build
```

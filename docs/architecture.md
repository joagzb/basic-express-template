# Architecture

The User feature is the source-of-truth example for this four-layer template. Requests move through explicit routes and thin controllers into framework-independent application services.

## Dependency direction

```text
presentation -> application -> domain
infrastructure -------------> domain
server -> presentation + application + infrastructure
```

| Layer            | Owns                                              | Must not depend on                                 |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| `domain`         | Business models and repository/security contracts | Express, TypeORM, Redis, environment configuration |
| `application`    | Use cases, DTOs, validators, application errors   | Express or concrete adapters                       |
| `infrastructure` | TypeORM, PostgreSQL, Redis, Pino, JWT, bcrypt     | HTTP response policy                               |
| `presentation`   | Express controllers, routes, middleware, OpenAPI  | TypeORM, Redis clients, business orchestration     |
| `src/server.ts`  | Provider selection and dependency injection       | Feature behavior                                   |

## Reference flow: User

```text
UserRoutes
  -> AuthenticationMiddleware
  -> UserController
  -> UserService
  -> UserValidator
  -> UserRepository
  -> memory or TypeORM adapter
```

- `src/domain/users/user.ts` defines persisted domain shapes.
- `src/domain/users/user.repository.ts` defines the persistence port.
- `src/application/users/user.dto.ts` defines create and update use-case inputs.
- `src/application/users/user.validator.ts` validates and normalizes raw values.
- `src/application/users/user.service.ts` rejects invalid DTOs before calling the repository.
- `src/presentation/http/users/user.controller.ts` extracts `body` or `params`, delegates, selects status codes, and forwards errors.
- `src/presentation/http/users/user.routes.ts` defines the protected `/users` endpoints.

Application DTOs are not persistence entities. They describe one use case and may map into domain types after validation. Domain models remain stable and framework-independent; TypeORM metadata stays in infrastructure.

## Auth and Health

Auth mirrors User with `auth.dto.ts`, `auth.validator.ts`, `AuthService`, `AuthController`, and `AuthRoutes`. Password hashing and JWT behavior are domain contracts implemented by infrastructure and injected into `AuthService`.

Health has no repository. `HealthService` constructs `HealthDto`; `HealthController` only maps it to HTTP; `HealthRoutes` declares `/health/ping`.

## Composition and errors

`src/server.ts` selects persistence, connects optional Redis, constructs validators and services, and calls `createRoutes()`. `src/app.ts` mounts injected route definitions, OpenAPI, not-found handling, and the final error middleware. It never connects external services or opens a listener.

Application validation throws `ValidationError`. Controllers forward errors with `next(error)`, and HTTP middleware maps known errors to stable JSON responses while sanitizing unexpected failures.

## Persistence providers

`PersistenceProvider` is the exhaustive provider enum. `select-user-persistence.ts` maps each provider to a `UserRepository` adapter and lifecycle resources. Provider strings and adapter selection must not appear in services or controllers.

## Verification

Unit-test validators and services without Express. Test HTTP contracts through `createApp()` without opening a listener. Keep live PostgreSQL and Redis tests opt-in.

```bash
npm run check
npm run build
```

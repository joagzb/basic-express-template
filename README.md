# Basic Express TypeScript Template

A compact Express API starter with TypeScript, four explicit layers, swappable persistence, validation, logging, JWT authentication, Swagger, and tests.

## Requirements

- Node.js 20+ (`.nvmrc` pins the repository's current Node.js 22 release)
- npm 10+
- PostgreSQL when using the default persistence provider
- Redis only when `REDIS_ENABLED=true`
- Docker with Docker Compose (optional alternative for local dependencies)

## Run the app

The development example defaults to PostgreSQL at `localhost:5433`. Start a compatible PostgreSQL instance with the credentials in `.env.development.example`, then run:

```bash
npm install
cp .env.development.example .env.development
npm run dev
```

TypeORM runs the registered migrations during PostgreSQL startup; schema synchronization is disabled. For an external-service-free, process-local run, explicitly set `PERSISTENCE_PROVIDER=memory` and leave `REDIS_ENABLED=false`. Memory data is lost when the process exits and is not the default.

Alternatively, start the development stack with Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

The API runs at <http://localhost:3000/api>, health at <http://localhost:3000/api/health/ping>, and Swagger UI at <http://localhost:3000/api/docs>.

## Environment configuration

The app loads `.env.<NODE_ENV>` followed by `.env`; development is the default environment. Copy the matching `.env.development.example`, `.env.test.example`, or `.env.production.example` file and never commit real secrets.

`PERSISTENCE_PROVIDER` selects `postgres` (the default) or process-local `memory`. Configure `POSTGRES_*` when using PostgreSQL. Redis is an optional, independent startup dependency selected with `REDIS_ENABLED`; when enabled, configure `REDIS_*` and ensure Redis is reachable before startup. `USER_CACHE_TTL_SECONDS` controls cached `GET /users` and `GET /users/:id` results (default: 60 seconds). Server and security settings include `HOST`, `PORT`, `URL_PREFIX`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `REFRESH_TOKEN_EXPIRES_IN_SECONDS` (default: 30 days), and `BCRYPT_ROUNDS`.

Redis-enabled startup is fail-fast. Runtime user-cache failures are fail-open and fall back to the authoritative repository. Session creation, refresh rotation, and logout fail closed. When `REDIS_ENABLED=false`, the app still starts and user endpoints operate without caching, but login, registration session issuance, refresh, and logout return `503` rather than pretending sessions are active.

## API and authentication

Health, registration, login, and token refresh are public. Registration and login return a short-lived JWT access token plus an opaque rotating refresh token as JSON. The access token is required by every user endpoint and by logout:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","surname":"Lovelace","dateOfBirth":"1815-12-10","email":"ada@example.com","password":"correct-password"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"correct-password"}'

curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <access-token>"

curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<opaque-refresh-token>"}'

curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

Registration requires `name`, `surname`, `dateOfBirth` (`YYYY-MM-DD`), `email`, and a password of at least six characters. Login requires `email` and the same password minimum. Names and email are normalized; passwords remain opaque. Refresh tokens are single-use: each successful refresh atomically replaces the stored digest, and reuse revokes that session. Multiple sessions per user are allowed; logout revokes only the session identified by the access token. Protected user requests verify the JWT only and do not query Redis.

Protected user routes are `GET` or `POST /api/users` and `GET`, `PATCH`, or `DELETE /api/users/:id`. User create requires `name`, `surname`, and `dateOfBirth`; update accepts a non-empty subset of those fields. Create, lookup, and successful update operations return user records; delete returns an empty `201` response. Singular `/api/user` paths are not mounted. Swagger UI at `/api/docs` documents request examples and supports Bearer-token authorization.

## Structure

The source uses `domain`, `application` (Service Layer), `infrastructure`, and `presentation`, with explicit composition in `src/server.ts`. Persisted User and Auth requests flow from controller to application service, application-owned DTO validation, inward-owned contracts, and selected infrastructure adapters. The composition root wraps the selected user repository with Redis cache-aside behavior only when Redis is enabled; application services remain cache-unaware. Auth depends on token and session contracts while JWT, cryptographic refresh-token generation, and Redis storage remain infrastructure details. `src/app.ts` builds Express from injected route definitions and has no listener or external-connection side effects. See [Architecture](docs/architecture.md) and [Add an endpoint set](docs/adding-endpoints.md).

## Test and build

```bash
npm test
npm run check
npm run build
```

`npm test` and `npm run check` use in-memory persistence with Redis disabled, so they do not require external services. The PostgreSQL/Redis integration suite is opt-in through `npm run test:integration` and requires the configured test services. Production-shaped and isolated test Compose files are also included.

## Production note

This is a development-ready foundation. Add application-specific authorization, credential provisioning, secret management, observability, abuse controls, and deployment hardening before production use.

## License

MIT

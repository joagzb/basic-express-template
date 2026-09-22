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

`PERSISTENCE_PROVIDER` selects `postgres` (the default) or process-local `memory`. Configure `POSTGRES_*` when using PostgreSQL. Redis is an optional, independent startup dependency selected with `REDIS_ENABLED`; when enabled, configure `REDIS_*` and ensure Redis is reachable before startup. Server and security settings include `HOST`, `PORT`, `URL_PREFIX`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, and `BCRYPT_ROUNDS`.

## API and authentication

Health, registration, and login are public. Register an account or sign in to obtain the access token required by every user endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","surname":"Lovelace","dateOfBirth":"1815-12-10","email":"ada@example.com","password":"correct-password"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"correct-password"}'

curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <access-token>"
```

Registration requires `name`, `surname`, `dateOfBirth` (`YYYY-MM-DD`), `email`, and a password of at least six characters. Login requires `email` and the same password minimum. Names and email are normalized; passwords remain opaque. Auth endpoints reject unexpected body fields.

Protected user routes are `GET` or `POST /api/users` and `GET`, `PATCH`, or `DELETE /api/users/:id`. User create requires `name`, `surname`, and `dateOfBirth`; update accepts a non-empty subset of those fields. Create, lookup, and successful update operations return user records; delete returns an empty `201` response. Singular `/api/user` paths are not mounted. Swagger UI at `/api/docs` documents request examples and supports Bearer-token authorization.

## Structure

The source uses `domain`, `application` (Service Layer), `infrastructure`, and `presentation`, with explicit composition in `src/server.ts`. Persisted User and Auth requests flow from controller to application service, application-owned DTO validation, the domain-owned `IUserRepository` port, a selected infrastructure adapter, and then memory or TypeORM/PostgreSQL. Shared date and email validation lives at `src/application/shared/common.validator.ts`. A future JSON-file implementation would be another infrastructure adapter selected through configuration and the composition root; it would not change controllers, services, validators, or the repository port. The logger port lives at `src/application/shared/logger.interface.ts`, while its Pino adapter remains at `src/infrastructure/logging/logger.service.ts`. Redis is optional startup infrastructure and is not currently injected into feature services. `src/app.ts` builds Express from injected route definitions and has no listener or external-connection side effects. See [Architecture](docs/architecture.md) and [Add an endpoint set](docs/adding-endpoints.md).

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

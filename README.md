# Basic Express TypeScript Template

A small Express and TypeScript API template with clear layers, JWT authentication, Swagger, tests, and selectable memory or PostgreSQL persistence.

> This is a development template, not a production-ready service. Review the [known limitations](docs/known-limitations.md) and add application-specific security, observability, and deployment hardening before production use.

## Quick start

The easiest local setup uses process-local memory and does not require PostgreSQL or Redis. Install Node.js 20 or newer and npm 10 or newer first. Node.js `22.22.2` (the version in `.nvmrc`) is recommended. You can install Node.js directly; `nvm` is optional.

If you use `nvm` on macOS or Linux, run:

```bash
nvm install
nvm use
```

On Windows with nvm-windows, specify the version explicitly:

```powershell
nvm install 22.22.2
nvm use 22.22.2
```

Then install dependencies and create the local environment file:

```bash
npm ci
cp .env.development.example .env.development
```

Set this value in `.env.development`:

```dotenv
PERSISTENCE_PROVIDER=memory
REDIS_ENABLED=false
```

Then start the API:

```bash
npm run dev
```

- API: <http://localhost:3000/api>
- Health: <http://localhost:3000/api/health/ping>
- Swagger UI: <http://localhost:3000/api/docs>

The repository pins its Node.js version in `.nvmrc` and supports npm 10+.

## Choose persistence

`PERSISTENCE_PROVIDER` selects storage for users, auth sessions, and atomic registration.

| Value      | Users, auth sessions, and registration                                         |
| ---------- | ------------------------------------------------------------------------------ |
| `memory`   | Process-local and lost on restart. Not shared between app instances.           |
| `postgres` | Stored durably in PostgreSQL through TypeORM. This is the development default. |

For PostgreSQL, use the `POSTGRES_*` values in `.env.development.example`. Registered migrations run at startup; schema synchronization is disabled.

Registration creates the user credential and initial auth session atomically through the selected provider. PostgreSQL performs both inserts in one transaction; memory commits both records to one shared process-local state.

## Optional Redis setup

Redis is generic infrastructure for future consumers. It is **not** used for user endpoint caching, authentication, or auth-session storage.

To connect Redis at startup, set:

```dotenv
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Startup fails if Redis is enabled but unavailable. Leave `REDIS_ENABLED=false` when Redis is not needed. See [Redis integration](docs/redis.md) for the available operations and extension guidance.

## Docker Compose

The development stack starts the API, PostgreSQL, and optional generic Redis infrastructure:

```bash
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml down
```

Add `--volumes` to the `down` command to remove stored development data.

## Test and verify

```bash
npm test
npm run test:watch
npm run check
npm run build
npm run test:integration
```

Normal unit tests use memory persistence with Redis disabled. Integration tests require the configured external services. Docker-based test commands are also available as `npm run test:compose` and `npm run test:compose:down`.

## Focused guides

- [Architecture](docs/architecture.md)
- [Add an endpoint set](docs/adding-endpoints.md)
- [Add HTTP middleware safely](docs/middlewares.md)
- [Redis integration](docs/redis.md)
- [Known limitations](docs/known-limitations.md)

## License

MIT

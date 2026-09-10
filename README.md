# Basic Express TypeScript Template

A compact Express API starter with TypeScript, four explicit layers, swappable persistence, validation, logging, JWT authentication, Swagger, and tests.

## Requirements

- Node.js 20+
- npm 10+
- Docker with Docker Compose (optional)

## Run the app

For a local npm run:

```bash
npm install
cp .env.development.example .env.development
npm run dev
```

Alternatively, start the development stack with Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

The API runs at <http://localhost:3000/api>, health at <http://localhost:3000/api/health/ping>, and Swagger UI at <http://localhost:3000/api/docs>.

## Environment configuration

The app loads `.env.<NODE_ENV>` followed by `.env`; development is the default environment. Copy the matching `.env.development.example`, `.env.test.example`, or `.env.production.example` file and never commit real secrets.

`PERSISTENCE_PROVIDER` selects `postgres` (the default) or process-local `memory`. Configure `POSTGRES_*` when using PostgreSQL. Redis is independent and uses `REDIS_ENABLED` plus `REDIS_*`. Server and security settings include `HOST`, `PORT`, `URL_PREFIX`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, and `BCRYPT_ROUNDS`.

Development and test startup explicitly seed `developer@example.com` / `development-password` through the selected user repository. This fixture is disabled in production; production credentials must be provisioned in persistent storage with a bcrypt password hash.

## API and authentication

Health and login are public. Every user endpoint requires the access token returned by login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@example.com","password":"development-password"}'

curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <access-token>"
```

Protected user routes are `GET /api/users`, `POST /api/user`, and `GET`, `PATCH`, or `DELETE /api/user/:id`. Swagger UI at `/api/docs` documents request examples and supports Bearer-token authorization.

## Structure

The source uses `domain`, `application` (Service Layer), `infrastructure`, and `presentation`, with explicit composition in `bootstrap`. Injectable application ports hide Redis key/value operations and structured Pino logging from consumers. HTTP and external DTOs use Zod; environment configuration is parsed directly in `config/env.ts`. See [Architecture](docs/architecture.md) for API details, dependency rules, and extension guidance.

## Test and build

```bash
npm test
npm run check
npm run build
```

Production-shaped and isolated test Compose files are also included.

## Production note

This is a development-ready foundation. Add application-specific authorization, credential provisioning, secret management, observability, abuse controls, and deployment hardening before production use.

## License

MIT

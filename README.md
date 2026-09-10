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

Protected user routes are `GET` or `POST /api/users` and `GET`, `PATCH`, or `DELETE /api/users/:id`. Singular `/api/user` paths are not mounted. Swagger UI at `/api/docs` documents request examples and supports Bearer-token authorization.

## Structure

The source uses `domain`, `application` (Service Layer), `infrastructure`, and `presentation`, with explicit composition in `src/server.ts`. `src/app.ts` builds Express from route definitions and has no listener or external-connection side effects. Application services construct and validate DTOs with typed manual validators; controllers only pass raw HTTP values and map responses. See [Architecture](docs/architecture.md) for dependency rules and [Add an endpoint set](docs/adding-endpoints.md) for the current extension workflow.

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

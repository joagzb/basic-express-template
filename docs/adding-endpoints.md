# Add an endpoint set

1. Add domain models and contracts only when the use case needs them.
2. Add application DTOs, a typed manual validator, and a Service Layer class.
3. Add a thin controller and an explicit `BaseRoutes` subclass.
4. Wire the service through `createRoutes()` and `src/server.ts`.
5. Update OpenAPI and focused service/HTTP tests.
6. Run `npm run check` and `npm run build`.

## 1. Define domain contracts

Put stable business models in `src/domain/<feature>` and repository interfaces beside them. Do not import Express, TypeORM, Redis, JWT libraries, or environment configuration.

Skip this layer when the use case has no domain behavior or persistence, as Health does.

## 2. Define DTOs and validation

Put use-case DTOs in `src/application/<feature>/<feature>.dto.ts`. Put typed manual validation in `<feature>.validator.ts`; do not add a validation framework or a validator interface only for ceremony. The concrete validator is application-owned use-case policy, unlike repository and external-service ports that isolate replaceable dependencies.

Reuse `src/application/shared/validators/common.validator.ts` for the template's calendar-date and email format checks instead of duplicating those rules in feature validators.

The validator should:

- validate required, optional, and format constraints;
- normalize accepted values, such as trimming names and lowercasing email;
- return a typed `ValidationResult<Dto>`.

The service owns its validator, converts a failed result into `ValidationError` before invoking a repository, and passes only the validated DTO value inward.

```ts
export class ProjectService {
  private readonly validator = new ProjectValidator();

  public constructor(private readonly projects: ProjectRepository) {}

  public async create(project: CreateProjectDto): Promise<Project> {
    const result = this.validator.validateNewProject(project);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }
    return this.projects.create(result.value);
  }
}
```

## 3. Implement adapters

Implement domain-owned repository contracts under `src/infrastructure`. A persisted feature needs both memory and PostgreSQL adapters when it participates in the configured provider choice. Keep TypeORM entities under `src/infrastructure/persistence/postgres/entities`, map them to framework-independent domain types, and register entities and migrations in the existing data source. User persistence currently selects interchangeable memory and TypeORM/PostgreSQL implementations of `IUserRepository`.

Cross-cutting storage behavior belongs in infrastructure adapters behind inward contracts. User endpoints currently use authoritative persistence directly and are not cached. Application services must not import node-redis; future Redis consumers should depend on `IRedisOperations` and be composed in `src/server.ts`. Choose failure policy explicitly: derived caches may fail open, while authoritative state must fail closed. See [Use the Redis integration](redis.md) for the current boundaries.

When multiple repositories share one provider lifecycle or transaction boundary, return them as one explicit bundle from each enum-keyed provider factory. Auth registration follows this pattern so the selected provider owns its atomic commit.

## 4. Add the controller

Use plain Express `Request`, `Response`, and `NextFunction`. Pass DTO-shaped request values, delegate once, map the HTTP response, and forward failures.

```ts
export class ProjectController {
  public constructor(private readonly projects: ProjectService) {}

  public readonly create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(201).json(await this.projects.create(request.body));
    } catch (error) {
      next(error);
    }
  };
}
```

Do not validate DTOs, call repositories, or select adapters in the controller.

## 5. Define routes

Extend `BaseRoutes`, set the feature path, and register methods explicitly. Apply `AuthenticationMiddleware` at router level when every endpoint is protected.

```ts
export class ProjectRoutes extends BaseRoutes<ProjectController> {
  public constructor(controller: ProjectController) {
    super('/projects', controller);
    this.registerEndpoints(this.controller);
  }

  protected registerEndpoints(controller: ProjectController): void {
    this.router.post('/', controller.create);
  }
}
```

## 6. Wire dependencies

Add the service to `RouteDependencies`, construct its controller and routes in `routes.factory.ts`, and inject the fully constructed service from `src/server.ts`. Keep `src/app.ts` limited to global HTTP composition. Shared inward contracts belong under domain/application; concrete adapters such as Redis, Pino, JWT, and bcrypt remain under `src/infrastructure`. When adding refresh-like state transitions, expose one atomic adapter operation rather than composing an unsafe read followed by a write in the application service.

## 7. Test and document

- Service tests: validation, normalization, repository calls, and no write after invalid input.
- HTTP tests: authentication, status/body contracts, error propagation, and malformed input.
- Adapter tests: persistence mapping and provider-specific failures.
- Session tests: provider-specific behavior, expiry, rotation, reuse handling, and revocation without live Redis.
- OpenAPI: paths, request DTOs, response DTOs, errors, and security.

The default application startup requires PostgreSQL and runs registered TypeORM migrations automatically. Use memory persistence only as an explicit non-durable choice.

Continue with [Add HTTP middleware safely](middlewares.md) or [Use the Redis integration](redis.md) when the endpoint needs either cross-cutting behavior.

# Add an endpoint set

Follow the User feature. Keep each dependency visible and place every concern in its owning layer.

## Quick path

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

Implement domain-owned repository contracts under `src/infrastructure`. A persisted feature needs both memory and PostgreSQL adapters when it participates in the configured provider choice. Register TypeORM entities and migrations in the existing data source. User persistence currently selects interchangeable memory and TypeORM/PostgreSQL implementations of `IUserRepository`; a future JSON-file adapter belongs here and should require only infrastructure, configuration, and composition changes.

Cross-cutting storage behavior belongs in infrastructure decorators or adapters behind inward contracts. The User cache decorator implements `IUserRepository`, performs cache-aside reads, invalidates after successful writes, and is applied only in `src/server.ts`. Application services must not import Redis. Choose failure policy explicitly: derived caches may fail open, while authoritative session or token-rotation state must fail closed.

If multiple repositories share one provider lifecycle, evolve the persistence selector into an explicit bundle and return every repository from each enum-keyed provider factory.

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
- Cache/session tests: hit/miss behavior, invalidation, failure policy, atomic rotation/reuse, and revocation through fake ports without live Redis.
- OpenAPI: paths, request DTOs, response DTOs, errors, and security.

Update `README.md` for public behavior and this architecture guide when boundaries or wiring change.

The default application startup requires PostgreSQL and runs registered TypeORM migrations automatically. Use memory persistence only as an explicit non-durable choice.

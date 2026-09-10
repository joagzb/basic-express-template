# Add an endpoint set

Add a feature as one vertical slice across the current four layers. Application services own DTO construction and validation; Express controllers stay thin; `src/server.ts` remains the composition root.

## Quick path

1. Add a domain model and repository contract only if the use case needs persistence.
2. Add an application service that accepts raw values and constructs a DTO for arguments and responses.
3. Add a plain Express controller and a `BaseRoutes` subclass.
4. Register the route definition in `presentation/http/base/routes.factory.ts` and construct dependencies in `src/server.ts`.
5. Add service and HTTP tests, then update `presentation/http/openapi.ts` and public docs.
6. Run `npm run check` and `npm run build`.

## Example: projects

Assume the API needs `POST /api/projects` and `GET /api/projects`.

### 1. Define the domain boundary when persistence is needed

Create `src/domain/projects/project.ts`:

```ts
export interface Project {
  readonly id: string;
  readonly name: string;
}

export type NewProject = Omit<Project, 'id'>;
```

Create `src/domain/projects/project.repository.ts`:

```ts
import {NewProject, Project} from './project';

export interface ProjectRepository {
  create(input: NewProject): Promise<Project>;
  findAll(): Promise<Project[]>;
}
```

Skip the repository contract and infrastructure step for a use case that does not store or retrieve data. Domain files must not import Express, TypeORM, configuration, or provider code.

### 2. Implement the application service and DTO validation

Create `src/application/projects/project.service.ts`. Accept `unknown` at the use-case boundary, validate it manually, and return domain values:


The service owns accepted fields, normalization, DTO construction, and use-case rules. Do not add Zod or move this responsibility into Express middleware.

### 3. Add infrastructure adapters

Implement `ProjectRepository` under `src/infrastructure/persistence`, for example:

- `memory/in-memory-project.repository.ts`
- `postgres/typeorm-project.repository.ts`
- a TypeORM entity and migration when PostgreSQL storage is required

The current persistence composition is user-specific. `src/infrastructure/persistence/select-user-persistence.ts` exports `UserPersistence`, whose `repository` field is a `UserRepository`, and its enum-keyed `persistenceFactories` only constructs user adapters. A persisted project feature is not complete until that bundle and its lifecycle composition are extended.

Use the existing `memory` and `postgres` provider choices; they already describe the storage technology. Do not add a provider enum value for each feature. Extend these exact points together:

| Current extension point                                     | Required project change                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infrastructure/persistence/select-user-persistence.ts` | Evolve `UserPersistence` into a shared persistence bundle with explicit `userRepository` and `projectRepository` fields. Update both `PersistenceProvider.MEMORY` and `PersistenceProvider.POSTGRES` factories to return both adapters. Rename the file and selector if the bundle is no longer user-specific. |
| `src/infrastructure/persistence/postgres/data-source.ts`    | Register `ProjectEntity` and the project migration with the same TypeORM `DataSource`. This keeps one datasource for the configured PostgreSQL lifecycle.                                                                                                                                                      |
| `src/server.ts`                                             | Read both repositories from the selected bundle, construct `UserService`, `AuthService`, and `ProjectService`, then pass the services to `createRoutes()`. Keep the existing datasource cleanup path.                                                                                                          |
| `src/__tests__/persistence-provider.test.ts`                | Prove both provider factories return the project adapter and that PostgreSQL still initializes and cleans up one datasource.                                                                                                                                                                                   |
| `src/__tests__/infrastructure.integration.test.ts`          | Add live project persistence checks only when the opt-in integration environment should cover the new tables.                                                                                                                                                                                                  |

For example, the evolved result should be explicit rather than overloading the existing `repository` field:

```ts
export interface PersistenceBundle {
  readonly userRepository: UserRepository;
  readonly projectRepository: ProjectRepository;
  readonly dataSource?: DataSource;
}
```

Both enum-keyed factories must satisfy this bundle. The memory factory creates `InMemoryUserRepository` and `InMemoryProjectRepository`; the PostgreSQL factory initializes one datasource and creates `TypeOrmUserRepository` and `TypeOrmProjectRepository` from their entities. If datasource initialization or adapter construction fails, preserve the selector's current cleanup behavior.

If projects are intentionally process-local and do not share the configured persistence provider, say so in the feature documentation and inject one `InMemoryProjectRepository` directly from `src/server.ts`. That is an application constraint, not a generic persisted implementation.

### 4. Add a plain Express controller

Create `src/presentation/http/projects/project.controller.ts`:

```ts
import {NextFunction, Request, Response} from 'express';
import {ProjectService} from '../../../application/projects/project.service';

export class ProjectController {
  public constructor(private readonly projects: ProjectService) {}

  public readonly create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(201).json(await this.projects.create(request.body, request.query));
    } catch (error) {
      next(error);
    }
  };

  public readonly findAll = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json(await this.projects.findAll(request.query));
    } catch (error) {
      next(error);
    }
  };
}
```

The controller only extracts raw Express values, delegates, selects the HTTP status, and forwards errors.

### 5. Define routes with `BaseRoutes`

Create `src/presentation/http/projects/project.routes.ts`:

```ts
import {BaseRoutes} from '../base/base.routes';
import {ProjectController} from './project.controller';

export class ProjectRoutes extends BaseRoutes<ProjectController> {
  public constructor(controller: ProjectController) {
    super('/projects', controller);
    this.registerEndpoints(this.controller);
  }

  protected registerEndpoints(controller: ProjectController): void {
    this.router.get('/', controller.findAll);
    this.router.post('/', controller.create);
  }
}
```

Add `AuthenticationMiddleware` with `router.use(authentication.handle)` when the whole endpoint set is protected, as `UserRoutes` does.

### 6. Register and compose the feature

In `src/presentation/http/base/routes.factory.ts`:

1. Add `projectService` to `RouteDependencies`.
2. Construct `ProjectController` and `ProjectRoutes`.
3. Add `.definition` to the returned route array.

In `src/server.ts`, construct the selected project repository and `ProjectService`, then pass the service to `createRoutes()`. Do not make `src/app.ts` construct feature services: it only applies global middleware, mounts the supplied route definitions, mounts Swagger, and installs final error handlers.

### 7. Test the slice

- Add service tests using an in-memory or fake `ProjectRepository`; cover DTO validation and use-case behavior.
- Add HTTP tests through `createApp({config, logger, routes})`; do not open a listener.
- Cover authentication, status codes, response bodies, malformed inputs, and route-not-found behavior where relevant.
- Add adapter and provider-selection tests for new persistence behavior.
- Keep live PostgreSQL or Redis checks opt-in integration tests.

### 8. Update the API contract

Add `/projects` operations and schemas to `src/presentation/http/openapi.ts`. Update `README.md` when startup, commands, public routes, or architecture entry points change. Update `docs/architecture.md` when a layer, composition rule, or source location changes.


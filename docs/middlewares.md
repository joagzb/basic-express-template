# Add HTTP middleware safely

This template uses explicit middleware ordering and one final error handler so both expected and unexpected failures produce stable responses.

## Quick path

1. Choose app-wide, feature-router, or endpoint scope.
2. Implement a `RequestHandler`, calling `next()` once on success and `next(error)` on failure.
3. Register it before the controller that depends on it.
4. Keep the not-found and error handlers last.
5. Test success, rejection, ordering, request augmentation, and error forwarding.

## Request flow

```text
HTTP request
    |
    v
Helmet -> CORS -> request logger -> JSON parser
    |
    v
mounted feature router
    |
    +-> authentication -> authorization -> controller -> response
    |          |               |              |
    |          +---------------+--------------+
    |                        error
    v                          |
not-found handler <------------+
    |
    v
final error handler -> safe HTTP error response
```

`src/app.ts` establishes the global order. It mounts all injected route definitions after the global middleware, then mounts `createNotFoundHandler()` and `createErrorHandler(logger)` last. `UserRoutes` is the feature-level reference: `AuthenticationMiddleware.handle` is registered before every User controller method.

Ordering is behavior, not decoration. Body parsing must run before code reads `request.body`; authentication must establish a principal before authorization uses it; the controller runs only after every guard calls `next()`.

## Choose the narrowest scope

| Scope         | Register in                               | Use for                                               |
| ------------- | ----------------------------------------- | ----------------------------------------------------- |
| Every request | `src/app.ts`                              | security headers, CORS, request logging, body parsing |
| One feature   | the feature's `BaseRoutes` subclass       | authentication shared by all feature endpoints        |
| One endpoint  | immediately before its controller handler | endpoint-specific policy                              |

Put reusable HTTP middleware in `src/presentation/http/middleware`. Keep feature-specific middleware beside its routes. Use a function for stateless behavior or a class with a stable `handle: RequestHandler` property when dependencies must be injected.

## Handle success and failure explicitly

Middleware has three valid outcomes:

```text
accepted request  -> call next() exactly once
expected failure  -> call next(new AppError(...)) and return
unexpected failure -> catch it, call next(error), and return
```

Never send a response and then call `next()`. Never swallow a rejected promise. For asynchronous middleware, wrap awaited work in `try/catch` because this repository uses Express 4; forward the caught value with `next(error)`.

`AuthenticationMiddleware` demonstrates an expected rejection. Missing or invalid Bearer credentials become stable `AppError` values. A middleware that calls an external dependency should preserve unexpected errors instead:

```ts
public readonly handle: RequestHandler = async (request, _response, next): Promise<void> => {

  try {
    (request as ContextRequest).context = await this.contexts.load(request);
    next();
  } catch (error) {
    next(error);
  }

};
```

If later handlers need new request state, define an augmented `Request` interface and assign it only after validation. Keep the cast at that narrow assignment boundary, as `AuthenticationMiddleware` does for `AuthenticatedRequest.auth`.

## How errors become responses

```text
middleware/controller calls next(error)
                 |
                 v
createErrorHandler(logger)
    |-- malformed JSON -----------------> 400 INVALID_JSON
    |-- AppError ------------------------> declared status and code
    |-- ValidationError -----------------> 400 VALIDATION_ERROR
    |-- SessionStoreUnavailableError ----> 503 AUTH_SESSIONS_UNAVAILABLE
    `-- every other error ---------------> log details, return 500 INTERNAL_ERROR
```

The final handler logs unexpected errors with method and path, but sends only `An unexpected error occurred`. This graceful fallback prevents unhandled situations from exposing stack traces or implementation details. Routes that match nothing are converted into a 404 `AppError` before reaching the same handler.

## Wire dependency-aware middleware

Construct middleware in `src/presentation/http/base/routes.factory.ts`, pass it into the route class, and register it before the protected controller:

```ts
const authentication = new AuthenticationMiddleware(deps.accessTokenService);

new UserRoutes(new UserController(deps.userService), authentication);
```

Keep application services and domain models unaware of Express. Update OpenAPI security requirements and documented error responses whenever middleware changes a route contract.

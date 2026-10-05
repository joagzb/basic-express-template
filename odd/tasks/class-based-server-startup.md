# Class-Based Presentation and Infrastructure

## Objective

Make exported behavior in `src/presentation` and `src/infrastructure` follow the project's class-based convention, while preserving current APIs at the HTTP/runtime boundaries and avoiding classes for private pure helpers.

## Problem and Why

The server bootstrap is now organized as a class, but function-based middleware, composition factories, persistence selection, and retry/configuration helpers remain across the presentation and infrastructure layers. The user wants a consistent class-oriented structure across these folders.

## Scope

- Convert exported behavior functions in `src/presentation` and `src/infrastructure` into cohesive class responsibilities.
- Keep private, stateless implementation helpers as functions.
- Update direct consumers, tests, and the architecture/middleware guidance affected by the convention.
- Keep HTTP behavior, repository/provider behavior, logging, retry timing, and startup lifecycle unchanged.

## Constraints

- `createApp()` remains the HTTP assembly boundary and side-effect-free with respect to listeners and external connections.
- Preserve layer boundaries and existing runtime dependency direction.
- Express still receives standard callbacks; retain bound handlers and error-forwarding semantics.
- No Docker/Compose or remote operations. User has explicitly asked to work locally only.
- TDD: off, previously selected by the user; run ordinary focused/full checks.
- User-selected convention boundary: convert exported behavior to instance classes; retain small private pure functions such as body shaping and Fibonacci calculation.
- Advisory-only authored-line guidance: about 400 changed lines is not a hard cap and must not force omission or artificial splitting.

## Authorized Scope

`src/presentation/**`, `src/infrastructure/**`, direct consumers/tests, and the relevant architecture/middleware documentation. Do not alter endpoint contracts or unrelated domain/application behavior.

## Acceptance Criteria

- Exported behavior in presentation and infrastructure is exposed by cohesive classes/methods rather than top-level function factories/selectors/strategies.
- Private pure helpers may remain functions and remain unexported.
- Existing HTTP status/payload/middleware ordering, auth behavior, persistence-provider selection, retry semantics, logger redaction, Redis semantics, and lifecycle behavior remain unchanged.
- Tests cover the converted class boundaries and existing consumer behavior.
- Documentation describes the agreed class convention accurately.

## Tasks

- [x] ODD-1: Refactor the server startup composition into a readable `Server` class.
  - Route: delegated direct; mapping covered multiple startup/test files.
  - Commit: `ac963b952aa3752375847fdca90f129adb1bc7f2`.
  - Checks: `npm test`, `npm run check`, and `npm run build` passed (19 suites/88 tests passed; 1 suite and 1 test skipped).
- [x] ODD-2: Remove unused `bootstrapServer`, `ServerRuntime`, and `defaultRuntime`; move lifecycle actions into `Server`.
  - Route: delegated direct; writer covered server and lifecycle tests; parent moved the remaining listener helper into the class.
  - Commit: included in `ac963b952aa3752375847fdca90f129adb1bc7f2`.
  - Checks: `npm test`, `npm run check`, and `npm run build` passed.
- [x] ODD-3: Convert exported presentation behavior to classes and align presentation tests/docs.
  - Route: delegated direct; implementation spans middleware, route/OpenAPI composition, consumers, tests, and guidance.
  - Checks: focused `app.test.ts` and `server.test.ts` passed (2 suites/24 tests); `npm run check` passed (19 suites/88 tests passed; 1 suite and 1 test skipped); `npm run build` passed.
- [ ] ODD-4: Convert exported infrastructure behavior to classes and align infrastructure tests/docs.
  - Route: delegated direct; implementation spans retry, logger, persistence construction/selection, startup consumers, and tests.
  - Checks: focused infrastructure/startup tests, `npm run check`, and `npm run build`.

## Progress

- Branch: `release/update-v1.0.3`; prior startup refactor is committed at `ac963b952aa3752375847fdca90f129adb1bc7f2`; working tree was clean before restoring this task record.
- ODD-1/ODD-2 code is present in `src/server.ts` and `src/index.ts`; relevant tests are in `src/__tests__/server.test.ts`.
- CodeGraph index is unavailable; targeted delegated exploration mapped the source and call sites.
- User selected the scope: all exported behavior functions in presentation/infrastructure become instance classes; small private pure helpers remain functions.
- Native review preflight has failed previously before authority started due to repository-root resolution; do not contact remote services. Continue local implementation and checks only, but do not fabricate native review status or receipt.
- ODD-3 implementation converts exported presentation composition into `HttpMiddleware`, `RoutesFactory`, and `OpenApiDocument` instance classes. `createApp()` still only assembles the HTTP pipeline; Express receives stable callback properties, and private pure shaping helpers remain functions.
- Next: implement ODD-4 only; infrastructure behavior remains pending and unchanged by this task.

# @neoma/garmr — Fix Exports and Dependencies

## Context
Consumers importing anything from `@neoma/garmr` (e.g. just `EmailDto`) get the entire module graph dragged in — typeorm, nodemailer, event-emitter, etc. — because the barrel `index.ts` re-exports everything including `GarmrModule`, which imports all services and middlewares.

Additionally, the dependency classification is wrong: NestJS framework packages and typeorm are listed as direct deps when they should be peer deps (consumers already have them), `bcrypt` is listed but never used, and `@nestjs/event-emitter` / `typeorm` are required at runtime but not declared as peer deps.

**Current version:** 0.4.1 (local), 0.5.0 (published)

## 1. Fix Dependencies in `package.json`

### Move to `peerDependencies`:
- `@nestjs/common` (consumers always have this)
- `@nestjs/core` (consumers always have this)
- `@nestjs/platform-express` (consumers always have this)
- `@nestjs/event-emitter` (NestJS module consumers configure)
- `rxjs` (consumers always have this)
- `reflect-metadata` (consumers always have this)
- `class-validator` (consumers configure ValidationPipe)
- `typeorm` (not currently listed at all but required by authentication.service.ts and magic-link.service.ts — add as peer dep)

### Keep as direct `dependencies`:
- `jsonwebtoken` — internal implementation detail
- `cookie` — internal implementation detail
- `nodemailer` — internal implementation detail

### Remove entirely:
- `bcrypt` — never imported anywhere in source
- `@nestjs/mapped-types` — check if actually used; if not, remove

### Check `@nestjs/mapped-types` usage:
Search for imports of `@nestjs/mapped-types` in `libs/garmr/src/`. If unused, remove.

## 2. Slim Down Barrel Export (`libs/garmr/src/index.ts`)

The barrel should only export the **public interface** — things consumers directly reference in their code. Everything else is registered internally by `GarmrModule.forRoot()` via DI.

### Keep (public interface):
```typescript
// Module & Configuration
export * from "./garmr.module"
export * from "./garmr.options"

// Interface consumers implement
export * from "./interfaces/authenticatable.interface"

// DTO for request validation
export * from "./dtos/email.dto"

// Decorators used in consumer controllers
export * from "./decorators/principal.decorator"
export * from "./decorators/requires-permission.decorator"
export * from "./decorators/requires-any-permission.decorator"

// Exceptions consumers may catch or reference in filters
export * from "./exceptions/incorrect-credentials.exception"
export * from "./exceptions/invalid-credentials.exception"
export * from "./exceptions/invalid-magic-link-token.exception"
export * from "./exceptions/token-failed-verification.exception"
export * from "./exceptions/permission-denied.exception"

// Events consumers listen for via @OnEvent
export * from "./events/garmr-registered.event"
export * from "./events/garmr-authenticated.event"
```

### Remove from barrel (internal, injected via DI):
```typescript
// Services — injected by GarmrModule, never imported directly
// export * from "./services/authentication.service"
// export * from "./services/session.service"
// export * from "./services/token.service"
// export * from "./services/magic-link.service"
// export * from "./services/permission.service"

// Guards — registered by GarmrModule
// export * from "./guards/authenticated.guard"
// export * from "./guards/requires-permission.guard"

// Middlewares — applied by GarmrModule.configure()
// export * from "./middlewares/bearer-authentication.middleware"
// export * from "./middlewares/cookie-authentication.middleware"
```

## 3. Fix Test Imports

Tests in `libs/garmr/src/` may import services/guards/middlewares via the barrel (`@lib` alias or relative). After slimming the barrel, tests should use **direct relative imports** rather than the barrel. Search all spec files for imports from the barrel/index and update to direct paths.

Key spec files to check:
- `libs/garmr/src/garmr.module.spec.ts`
- `libs/garmr/src/services/*.spec.ts`
- `libs/garmr/src/guards/*.spec.ts`
- `libs/garmr/src/middlewares/*.spec.ts`

Tests likely already use direct imports since they're colocated, but verify.

## 4. Fix the `src/core/magic-link.controller.ts` (example app)

The example app at `src/core/magic-link.controller.ts` imports:
```typescript
import { MagicLinkService, SessionService, EmailDto } from "@neoma/garmr"
```

`MagicLinkService` and `SessionService` are no longer exported from the barrel. These are injected via DI so the **type imports** for constructor injection still need to resolve. Two options:
- Use `@lib` path alias for type imports in the example app
- Or keep service type exports in the barrel but behind a type-only re-export

**Recommended:** The example app should use direct `@lib` imports since it's internal. Check all files under `src/` (not `libs/`) for barrel imports and update.

## 5. Version Bump

Removing exports from the barrel is a **breaking change**. Bump to `0.6.0` (minor, pre-1.0 semver).

## Files to Modify

- `package.json` — restructure deps/peerDeps, remove bcrypt, add typeorm as peer
- `libs/garmr/src/index.ts` — slim barrel to public interface only
- `src/core/magic-link.controller.ts` — update imports from barrel to direct
- `src/core/*.ts` — check all example app files for barrel imports
- Any spec files that import via barrel — update to direct imports

## Verification

```bash
npm run build       # Library compiles cleanly
npm run lint        # No lint errors
npm test            # All unit specs pass
npm run test:e2e    # All e2e specs pass
```

After publishing, update `@neoma/garmr` in meetbertie's `package.json` and verify `import { EmailDto } from "@neoma/garmr"` no longer pulls in typeorm/nodemailer/etc.

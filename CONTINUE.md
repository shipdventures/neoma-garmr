# Continuation Instructions for Garmr Auth Library

## Current State

**Core library services are complete and tested:**
- `RegistrationService` - register users, hash passwords, emit events
- `AuthenticationService` - validate credentials, emit events
- `TokenService` - issue/verify/decode JWTs
- `PasswordService` - internal bcrypt abstraction

**Module configuration working:**
- `GarmrModule.forRoot({ secret, expiresIn, entity })` pattern
- Entity configured at module level

**Schematics infrastructure ready:**
- "Eject" schematic scaffolds customizable controllers
- Build copies templates to dist

## What's In Progress

**RegistrationController** - stub exists at `libs/garmr/src/controllers/registration.controller.ts`
- Currently empty, needs TDD implementation
- Exported via `Controllers` array from `@neoma/garmr`
- Users import as: `controllers: [...Controllers]` or cherry-pick individual controllers

## Next Steps (TDD)

1. **Write e2e test for POST /auth/register** in `specs/registration.e2e-spec.ts`
   - Test expects 201 with `{ id, email }` (no password in response)
   - Test validation errors
   - Test duplicate email handling

2. **Implement RegistrationController** to make tests pass
   ```typescript
   @Post("register")
   public async register(@Body() dto: RegistrationDto) {
     const user = await this.registrationService.register(dto)
     return { id: user.id, email: user.email }
   }
   ```

3. **Add LoginController** following same pattern
   - POST /auth/login with CredentialsDto
   - Returns token from TokenService

4. **Session middleware** - extract token, attach principal to request

5. **@Auth() guard** - protect routes requiring authentication

6. **@Principal() decorator** - access authenticated user in controllers

## Key Files

- `libs/garmr/src/index.ts` - exports (add new controllers here)
- `libs/garmr/src/controllers/` - controller implementations
- `src/app.module.ts` - test app using the library
- `src/user.entity.ts` - test entity implementing Authenticatable
- `specs/registration.e2e-spec.ts` - e2e tests for registration

## Running Tests

```bash
npm test -- --no-watch           # unit tests
npm run test:e2e -- --no-watch   # e2e tests
npm run build                    # build library to dist
```

## Design Decisions Made

- **Controllers in library, not scaffolded** - users import from `@neoma/garmr`
- **Schematic = eject** - only used when full customization needed
- **`Controllers` array export** - easy to spread all or cherry-pick
- **TDD approach** - always write tests first

# Session Context

## Current Work (wip/auth-cookie-support branch)

### Completed
- GarmrModule is now global (`global: true` in forRoot)
- Schematic generates CredentialsController, MeController, SessionsController
- TokenService.issue() returns `{ token, payload }`
- Cookie name is `garmr.sid`
- Middleware refactored to extract token from Bearer header and pass to service
- Middleware docstrings updated to reflect throwing behavior

### In Progress
- Add cookie support to middleware (use `cookie` package to parse, not cookie-parser)
- Service argument validation (null/undefined/missing email/password checks)

### Pending
- Fix service test at line 300 (includes "Bearer " prefix but service now expects raw token)
- Update service docstring (still says "Authorization header string")
- Clean up middleware test duplicate at lines 77-97
- SessionsController implementation
- API e2e test to verify cookie works via /me

## Design Decisions
- Middleware is silent when no auth header, throws for malformed headers, logs and continues for auth failures
- Service accepts `string | { email, password }` - middleware handles Bearer/cookie extraction
- Programmer errors (null, missing fields) should throw plain `Error`, not HTTP exceptions
- Cookie parsing: use `cookie` package directly, not cookie-parser middleware (avoids peer dep, JWTs don't need URL decoding or signed cookie support)

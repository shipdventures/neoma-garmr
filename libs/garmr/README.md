# @neoma/garmr

Passwordless authentication for NestJS. See the [main README](../../README.md) for full documentation.

## Quick Start

```typescript
import { GarmrModule, MagicLinkService, TokenService, SESSION_AUDIENCE } from "@neoma/garmr"

// 1. Configure module
GarmrModule.forRoot({
  secret: process.env.JWT_SECRET,
  expiresIn: "1h",
  entity: User,
  mailer: {
    host: "smtp.example.com",
    port: 587,
    from: "auth@example.com",
    subject: "Sign in",
    html: '<a href="https://app.com/verify?token={{token}}">Sign in</a>',
    auth: { user: "...", pass: "..." },
  },
})

// 2. Send magic link
await magicLinkService.send("user@example.com")

// 3. Verify and get/create user
const { entity, isNewUser } = await magicLinkService.verify<User>(token)

// 4. Issue session token
const { token } = tokenService.issue({ sub: entity.id, aud: SESSION_AUDIENCE })
```

## Exports

### Services
- `MagicLinkService` - Send and verify magic links
- `AuthenticationService` - Validate session bearer tokens
- `TokenService` - Issue and verify JWTs

### Guards & Decorators
- `Authenticated` - Guard for protected routes
- `Principal` - Extract authenticated user

### DTOs
- `EmailDto` - Email validation

### Events
- `GarmrRegisteredEvent` - New user created
- `GarmrAuthenticatedEvent` - Existing user authenticated

### Constants
- `MAGIC_LINK_AUDIENCE` - `"magic-link"`
- `SESSION_AUDIENCE` - `"session"`

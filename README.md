# @neoma/garmr

Passwordless authentication for NestJS applications. Garmr provides magic link authentication, JWT session management, cookie-based sessions, and route protection out of the box.

## Why Passwordless?

Password authentication requires secure hashing, strength validation, reset flows, and breach checking. Magic links eliminate all of this complexity. The email IS the verification - simpler for developers, fewer security footguns.

## Features

- Magic link authentication (send & verify)
- JWT session tokens with HS256 algorithm enforcement and audience validation
- Cookie-based sessions (httpOnly, secure, sameSite) with configurable options
- Dual transport: Bearer token and cookie authentication middlewares
- Route protection with guards and decorators
- Permission-based authorization with wildcard support (`@RequiresPermission`, `@RequiresAnyPermission`)
- Email normalization (case-insensitive)
- Event emission for registration and authentication

## Installation

```bash
npm install @neoma/garmr
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm jsonwebtoken class-validator nodemailer
```

## Getting Started

### 1. Create your User entity

Your user entity must implement the `Authenticatable` interface:

```typescript
import { Authenticatable } from "@neoma/garmr"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column({ unique: true })
  public email: string

  @Column("simple-array", { default: "" })
  public permissions: string[]
}
```

### 2. Configure GarmrModule

Import and configure `GarmrModule` in your application module:

```typescript
import { GarmrModule } from "@neoma/garmr"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { User } from "./user.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      // ... your database config
      entities: [User],
    }),
    GarmrModule.forRoot({
      secret: process.env.JWT_SECRET,
      expiresIn: "1h",
      entity: User,
      mailer: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        from: "auth@yourapp.com",
        welcome: {
          subject: "Welcome to YourApp",
          html: '<a href="https://yourapp.com/auth/verify?token={{token}}">Sign up</a>',
        },
        welcomeBack: {
          subject: "Sign in to YourApp",
          html: '<a href="https://yourapp.com/auth/verify?token={{token}}">Sign in</a>',
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      cookie: {
        name: "garmr.sid",  // default
        secure: true,       // default
        sameSite: "lax",    // default
        path: "/",          // default
        // domain: ".yourapp.com",  // optional
      },
    }),
  ],
})
export class AppModule {}
```

### 3. Enable validation

Garmr exports `EmailDto` with `class-validator` decorators. For validation to work, enable `ValidationPipe` in your application.

See the [NestJS Validation documentation](https://docs.nestjs.com/techniques/validation) for setup instructions.

### 4. Create authentication endpoints

Use the provided services to build your authentication endpoints:

```typescript
import { EmailDto, MagicLinkService, SessionService } from "@neoma/garmr"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from "@nestjs/common"
import { Response } from "express"

import { User } from "./user.entity"

@Controller("auth")
export class AuthController {
  public constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly sessionService: SessionService,
  ) {}

  @Post("magic-link")
  @HttpCode(HttpStatus.ACCEPTED)
  public async sendMagicLink(@Body() dto: EmailDto): Promise<void> {
    await this.magicLinkService.send(dto.email)
  }

  @Get("verify")
  public async verify(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string; user: User; isNewUser: boolean }> {
    const { entity, isNewUser } = await this.magicLinkService.verify<User>(token)
    const { token: sessionToken } = this.sessionService.create(res, entity)
    return { token: sessionToken, user: entity, isNewUser }
  }
}
```

`SessionService.create()` issues a session JWT and sets it as an httpOnly cookie on the response. The cookie's `Max-Age` is automatically aligned with the JWT's expiry.

### 5. Protect routes

Use the `Authenticated` guard and `Principal` decorator to protect routes:

```typescript
import { Authenticated, Principal } from "@neoma/garmr"
import { Controller, Get, UseGuards } from "@nestjs/common"

import { User } from "./user.entity"

@Controller("me")
@UseGuards(Authenticated)
export class ProfileController {
  @Get()
  public get(@Principal() user: User): { id: string; email: string } {
    return {
      id: user.id,
      email: user.email,
    }
  }
}
```

`GarmrModule` automatically applies `BearerAuthenticationMiddleware` and `CookieAuthenticationMiddleware` to all routes. They extract the JWT from the `Authorization: Bearer <token>` header or the `garmr.sid` cookie respectively, and attach the authenticated user to `req.principal`. Bearer takes priority when both are present.

## Magic Link Flow

1. User submits email -> `POST /auth/magic-link`
2. Server generates JWT with `aud: "magic-link"` and emails verification link
3. User clicks link -> `GET /auth/verify?token=...`
4. Server validates token, creates user (if new) or finds existing user
5. Server issues session JWT with `aud: "session"` and sets httpOnly cookie
6. Subsequent requests authenticate via cookie or `Authorization: Bearer <token>` header

## Example Requests

### Request Magic Link

```bash
curl -X POST http://localhost:3000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Success (202 Accepted):** Empty response, email sent.

**Validation error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["Please enter a valid email address."],
  "error": "Bad Request"
}
```

### Verify Magic Link

```bash
curl "http://localhost:3000/auth/verify?token=eyJhbGciOiJIUzI1NiIs..."
```

**Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "isNewUser": true
}
```

The response also includes a `Set-Cookie` header with the session token.

**Invalid token (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Invalid magic link token: invalid audience",
  "reason": "invalid audience",
  "error": "Unauthorized"
}
```

### Accessing Protected Routes

Via Bearer token:
```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Via cookie (set automatically by the verify endpoint):
```bash
curl http://localhost:3000/me \
  -b "garmr.sid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Not authenticated (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  "error": "Unauthorized"
}
```

## API Reference

### GarmrModule

#### `GarmrModule.forRoot(options)`

Configures the authentication module. The module is global — import it once in your root module.

| Option | Type | Description |
|--------|------|-------------|
| `secret` | `string` | JWT signing secret |
| `expiresIn` | `string \| number` | Session token expiration (e.g., "1h", "7d") |
| `entity` | `Type<Authenticatable>` | Your user entity class |
| `mailer` | `MailerOptions` | Email configuration (see below) |
| `cookie` | `CookieOptions` | Session cookie configuration (optional) |

#### MailerOptions

| Option | Type | Description |
|--------|------|-------------|
| `host` | `string` | SMTP host |
| `port` | `number` | SMTP port |
| `from` | `string` | Sender email address |
| `welcome` | `MailerTemplate` | Template sent to new users (registration) |
| `welcomeBack` | `MailerTemplate` | Template sent to existing users (login) |
| `auth.user` | `string` | SMTP username |
| `auth.pass` | `string` | SMTP password |

#### MailerTemplate

| Option | Type | Description |
|--------|------|-------------|
| `subject` | `string` | Email subject line |
| `html` | `string` | Email HTML body (use `{{token}}` placeholder) |

#### CookieOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `"garmr.sid"` | Cookie name |
| `domain` | `string` | — | Cookie domain |
| `path` | `string` | `"/"` | Cookie path |
| `secure` | `boolean` | `true` | Only send over HTTPS |
| `sameSite` | `"strict" \| "lax" \| "none"` | `"lax"` | SameSite attribute |

### Services

#### MagicLinkService

- `send(email: string): Promise<void>` - Sends a magic link email (uses `welcome` template for new users, `welcomeBack` for existing)
- `verify<T>(token: string): Promise<{ entity: T; isNewUser: boolean }>` - Validates token and returns/creates user

#### SessionService

- `create(res: Response, entity: Authenticatable): { token: string; payload: JwtPayload }` - Issues a session JWT and sets it as an httpOnly cookie
- `clear(res: Response): void` - Clears the session cookie

#### AuthenticationService

- `authenticate<T>(token: string): Promise<T>` - Validates a raw session JWT and returns the user

#### TokenService

- `issue(payload, options?): { token: string; payload: JwtPayload }` - Issues a JWT (HS256)
- `verify(token: string): JwtPayload` - Verifies a token (HS256 only)

### Middlewares

#### BearerAuthenticationMiddleware

Extracts JWT from the `Authorization: Bearer <token>` header. Throws `InvalidCredentialsException` for malformed headers. Logs and continues for authentication failures.

#### CookieAuthenticationMiddleware

Extracts JWT from the configured cookie (default `garmr.sid`). Logs and continues for authentication failures.

Both middlewares are automatically applied by `GarmrModule`. Bearer runs first; if it sets `req.principal`, the cookie middleware skips.

#### PermissionService

- `hasPermission(principal, permission): boolean` - Check if a principal has a specific permission
- `hasAllPermissions(principal, permissions): boolean` - Check if a principal has ALL permissions (AND logic)
- `hasAnyPermission(principal, permissions): boolean` - Check if a principal has at least one permission (OR logic)
- `requirePermission(principal, permission): void` - Throws `PermissionDeniedException` if missing
- `requireAllPermissions(principal, permissions): void` - Throws if any are missing (AND)
- `requireAnyPermission(principal, permissions): void` - Throws if all are missing (OR)

Valid permission formats:
- `*` — matches all permissions
- `name` — single-segment, exact match only (e.g., `admin`)
- `action:resource` — exact match (e.g., `read:users`)
- `*:resource` — matches any action on that resource (e.g., `*:articles` matches `read:articles`)
- `action:*` — matches an action on any resource (e.g., `read:*` matches `read:users`)

Invalid formats (e.g., `read:users:admin`, empty strings) throw at decoration time or at runtime.

### Constants

- `MAGIC_LINK_AUDIENCE` - Value: `"magic-link"` - Used for magic link tokens
- `SESSION_AUDIENCE` - Value: `"session"` - Used for session tokens

### Guards

#### Authenticated

A guard that ensures `req.principal` exists. Throws `UnauthorizedException` if not authenticated.

```typescript
@UseGuards(Authenticated)
@Controller("protected")
export class ProtectedController {}
```

### Decorators

#### Principal

Extracts the authenticated user from the request.

```typescript
@Get()
public getProfile(@Principal() user: User): User {
  return user
}
```

#### RequiresPermission

Enforces that the authenticated user has **all** of the specified permissions (AND logic). Automatically applies authentication and the permission guard.

```typescript
// Single permission
@Get("articles")
@RequiresPermission("read:articles")
public getArticles() {}

// Multiple permissions (AND — user must have both)
@Get("articles/edit")
@RequiresPermission("read:articles", "write:articles")
public editArticles() {}

// Class-level — applies to all methods
@Controller("admin")
@RequiresPermission("read:admin")
export class AdminController {}
```

#### RequiresAnyPermission

Enforces that the authenticated user has **at least one** of the specified permissions (OR logic).

```typescript
// User must have admin OR delete:articles
@Get("articles/delete")
@RequiresAnyPermission("admin", "delete:articles")
public deleteArticles() {}
```

Both decorators can be combined on a single method:

```typescript
// User must have read:reports AND (admin OR write:reports)
@Get("reports")
@RequiresPermission("read:reports")
@RequiresAnyPermission("admin", "write:reports")
public getReports() {}
```

### DTOs

#### EmailDto

- `email` - Required, must be valid email format

### Exceptions

| Exception | Status | When |
|-----------|--------|------|
| `InvalidMagicLinkTokenException` | 401 | Magic link token invalid or wrong audience |
| `TokenFailedVerificationException` | 401 | JWT verification failed (expired, invalid signature) |
| `IncorrectCredentialsException` | 401 | User not found for valid token |
| `InvalidCredentialsException` | 401 | Token invalid, wrong audience, or malformed header |
| `PermissionDeniedException` | 403 | User lacks required permission(s) |

### Events

#### GarmrRegisteredEvent

Emitted when a new user is created via magic link verification.

```typescript
import { GarmrRegisteredEvent } from "@neoma/garmr"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class NotificationService {
  @OnEvent(GarmrRegisteredEvent.EVENT_NAME)
  public async onRegistered(event: GarmrRegisteredEvent): Promise<void> {
    // Send welcome email, etc.
  }
}
```

#### GarmrAuthenticatedEvent

Emitted when an existing user verifies a magic link or authenticates via session token.

### Interfaces

#### Authenticatable

```typescript
interface Authenticatable {
  id: any
  email: string
  permissions?: string[]
}
```

Implement this on any entity you want to authenticate. The `permissions` field is optional — only needed if you use the permission decorators.

## Security

- JWTs are signed and verified with HS256 only — other algorithms are rejected
- Magic link tokens use `aud: "magic-link"`, session tokens use `aud: "session"` — cross-use is prevented
- Session cookies are httpOnly (not accessible to JavaScript), secure (HTTPS only), and SameSite=Lax by default
- Cookie `Max-Age` is automatically aligned with JWT expiry
- Error responses use a generic message — internal details are logged server-side only
- Email lookups are case-insensitive (normalized to lowercase)
- Magic links expire after 15 minutes

## License

MIT

# @neoma/garmr

Passwordless authentication for NestJS applications. Garmr provides magic link authentication, JWT session management, and route protection out of the box.

## Why Passwordless?

Password authentication requires secure hashing, strength validation, reset flows, and breach checking. Magic links eliminate all of this complexity. The email IS the verification - simpler for developers, fewer security footguns.

## Features

- Magic link authentication (send & verify)
- JWT session tokens with audience validation
- Automatic session middleware
- Route protection with guards and decorators
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
        subject: "Sign in to YourApp",
        html: '<a href="https://yourapp.com/auth/verify?token={{token}}">Click to sign in</a>',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
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
import {
  EmailDto,
  MagicLinkService,
  SESSION_AUDIENCE,
  TokenService,
} from "@neoma/garmr"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common"

import { User } from "./user.entity"

@Controller("auth")
export class AuthController {
  public constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly tokenService: TokenService,
  ) {}

  @Post("magic-link")
  @HttpCode(HttpStatus.ACCEPTED)
  public async sendMagicLink(@Body() dto: EmailDto): Promise<void> {
    await this.magicLinkService.send(dto.email)
  }

  @Get("verify")
  public async verify(
    @Query("token") token: string,
  ): Promise<{ token: string; user: User; isNewUser: boolean }> {
    const { entity, isNewUser } = await this.magicLinkService.verify<User>(token)
    const { token: sessionToken } = this.tokenService.issue({
      sub: entity.id,
      aud: SESSION_AUDIENCE,
    })
    return { token: sessionToken, user: entity, isNewUser }
  }
}
```

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

The `AuthenticationMiddleware` is automatically applied by `GarmrModule`, extracting the JWT from the `Authorization: Bearer <token>` header and attaching the user to `req.principal`.

## Magic Link Flow

1. User submits email → `POST /auth/magic-link`
2. Server generates JWT with `aud: "magic-link"` and emails verification link
3. User clicks link → `GET /auth/verify?token=...`
4. Server validates token, creates user (if new) or finds existing user
5. Server issues session JWT with `aud: "session"`
6. Client stores session token for subsequent requests

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

```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

Configures the authentication module.

| Option | Type | Description |
|--------|------|-------------|
| `secret` | `string` | JWT signing secret |
| `expiresIn` | `string` | Session token expiration (e.g., "1h", "7d") |
| `entity` | `Type<Authenticatable>` | Your user entity class |
| `mailer` | `MailerOptions` | Email configuration (see below) |

#### MailerOptions

| Option | Type | Description |
|--------|------|-------------|
| `host` | `string` | SMTP host |
| `port` | `number` | SMTP port |
| `from` | `string` | Sender email address |
| `subject` | `string` | Email subject line |
| `html` | `string` | Email HTML body (use `{{token}}` placeholder) |
| `auth.user` | `string` | SMTP username |
| `auth.pass` | `string` | SMTP password |

### Services

#### MagicLinkService

- `send(email: string): Promise<void>` - Sends a magic link email
- `verify<T>(token: string): Promise<{ entity: T; isNewUser: boolean }>` - Validates token and returns/creates user

#### AuthenticationService

- `authenticate<T>(bearerToken: string): Promise<T>` - Validates a session bearer token and returns the user

#### TokenService

- `issue(payload, options?): { token: string; payload: JwtPayload }` - Issues a JWT
- `verify(token: string): JwtPayload` - Verifies and decodes a token

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

### DTOs

#### EmailDto

- `email` - Required, must be valid email format

### Exceptions

| Exception | Status | When |
|-----------|--------|------|
| `InvalidMagicLinkTokenException` | 401 | Magic link token invalid or wrong audience |
| `TokenFailedVerificationException` | 401 | JWT verification failed (expired, invalid signature) |
| `IncorrectCredentialsException` | 401 | User not found for valid token |
| `InvalidCredentialsException` | 401 | Bearer token malformed or wrong audience |

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

Emitted when an existing user verifies a magic link.

### Interfaces

#### Authenticatable

```typescript
interface Authenticatable {
  id: any
  email: string
}
```

Implement this on any entity you want to authenticate.

## Security Considerations

- Magic link tokens use `aud: "magic-link"` claim, session tokens use `aud: "session"`
- `AuthenticationService.authenticate()` rejects tokens with wrong audience (prevents using magic links as session tokens)
- JWTs are verified for signature, expiration, and not-before claims
- The `alg=none` attack is prevented by requiring signature verification
- Email lookups are case-insensitive (normalized to lowercase)
- Magic links expire after 15 minutes

## License

MIT

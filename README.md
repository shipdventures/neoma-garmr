# @neoma/garmr

A complete email/password authentication library for NestJS applications. Garmr provides registration, authentication, JWT token management, and route protection out of the box.

## Features

- User registration with password hashing (bcrypt)
- Email/password authentication
- JWT token issuance and verification
- Automatic session middleware
- Route protection with guards and decorators
- Validation DTOs with customizable error messages
- Event emission for registration and authentication

## Installation

```bash
npm install @neoma/garmr
```

### Peer Dependencies

Garmr requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm bcrypt jsonwebtoken class-validator class-transformer
```

## Getting Started

### 1. Create your User entity

Your user entity must implement the `Authenticatable` interface:

```typescript
import { Authenticatable } from "@neoma/garmr"
import { Exclude } from "class-transformer"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column({ unique: true })
  public email: string

  @Exclude()
  @Column()
  public password: string
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
    }),
  ],
})
export class AppModule {}
```

### 3. Enable validation

Garmr exports DTOs (`RegistrationDto`, `CredentialsDto`) with `class-validator` decorators. For validation to work, you must enable `ValidationPipe` in your application. This applies to Garmr's DTOs and any custom DTOs you create.

See the [NestJS Validation documentation](https://docs.nestjs.com/techniques/validation) for setup instructions.

### 4. Create authentication endpoints

Use the provided services to build your authentication endpoints:

```typescript
import {
  AuthenticationService,
  CredentialsDto,
  RegistrationDto,
  RegistrationService,
  TokenService,
} from "@neoma/garmr"
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"

import { User } from "./user.entity"

@Controller("auth")
export class AuthController {
  public constructor(
    private readonly registrationService: RegistrationService,
    private readonly authenticationService: AuthenticationService,
    private readonly tokenService: TokenService,
  ) {}

  @Post("register")
  public async register(@Body() dto: RegistrationDto): Promise<{ token: string }> {
    const user = await this.registrationService.register<User>(dto)
    const token = this.tokenService.issue(user)
    return { token }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  public async login(@Body() dto: CredentialsDto): Promise<{ token: string }> {
    const user = await this.authenticationService.authenticate(dto)
    const token = this.tokenService.issue(user)
    return { token }
  }
}
```

**Token delivery is your choice.** The example above returns the token in the response body. You could also set it as an HttpOnly cookie for browser clients - the implementation is up to you.

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

## Example Requests

### Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecureP@ss1"}'
```

**Success (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["A strong password must be least 8 characters long and include at least 1 letter, 1 number, and 1 special character."],
  "error": "Bad Request"
}
```

**Duplicate email (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "The email user@example.com is already registered.",
  "email": "user@example.com",
  "error": "Conflict"
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecureP@ss1"}'
```

**Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Invalid credentials (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Incorrect credentials provided for the identifier user@example.com.",
  "identifier": "user@example.com"
}
```

### Accessing protected routes

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
| `expiresIn` | `string` | Token expiration (e.g., "1h", "7d") |
| `entity` | `Type<Authenticatable>` | Your user entity class |

### Services

#### RegistrationService

- `register<T>(dto: RegistrationDto): Promise<T>` - Registers a new user with hashed password

#### AuthenticationService

- `authenticate(dto: CredentialsDto): Promise<Authenticatable>` - Validates credentials and returns the user

#### TokenService

- `issue(user: Authenticatable): string` - Issues a JWT for the user
- `verify(token: string): JwtPayload` - Verifies and decodes a token
- `decode(token: string): JwtPayload | null` - Decodes without verification

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

#### RegistrationDto

- `email` - Required, must be valid email format
- `password` - Required, must meet strength requirements (8+ chars, letter, number, special char)

#### CredentialsDto

- `email` - Required, must be valid email format
- `password` - Required

### Exceptions

| Exception | Status | When |
|-----------|--------|------|
| `EmailAlreadyExistsException` | 409 | Email already registered |
| `IncorrectCredentialsException` | 401 | Invalid email or password |
| `TokenMalformedException` | 401 | JWT is malformed |
| `TokenFailedVerificationException` | 401 | JWT verification failed |

### Events

#### GarmrRegisteredEvent

Emitted after successful registration.

```typescript
import { GarmrRegisteredEvent } from "@neoma/garmr"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class NotificationService {
  @OnEvent(GarmrRegisteredEvent.event)
  public async onRegistered(event: GarmrRegisteredEvent): Promise<void> {
    // Send welcome email, etc.
  }
}
```

#### GarmrAuthenticatedEvent

Emitted after successful authentication.

## Security Considerations

- Passwords are hashed using bcrypt with automatic salt generation
- JWTs are verified for signature, expiration, and not-before claims
- The `alg=none` attack is prevented by requiring signature verification
- Tokens for non-existent users are rejected
- Email lookups are case-insensitive

## License

MIT

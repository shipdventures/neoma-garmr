# @neoma/garmr

A fully-fledged authentication solution for NestJS.

## Installation

```bash
npm install @neoma/garmr
```

**Peer dependencies:**
- `@nestjs/common`
- `@nestjs/core`
- `typeorm`
- `@nestjs/typeorm`
- `bcrypt`
- `class-validator`

## Quick Start

### 1. Define your User entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { Authenticatable } from "@neoma/garmr"
import { Exclude } from "class-transformer"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  @Exclude()
  password: string

  @Column()
  name: string
}
```

### 2. Import GarmrModule

```typescript
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { GarmrModule } from "@neoma/garmr"
import { User } from "./user.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      // ... your config
      entities: [User],
    }),
    TypeOrmModule.forFeature([User]),
    GarmrModule,
  ],
})
export class AppModule {}
```

### 3. Create a registration endpoint

**Option A: Pass DTO + Entity class (recommended)**

```typescript
import { Controller, Post, Body } from "@nestjs/common"
import { RegistrationService, RegistrationDto } from "@neoma/garmr"
import { User } from "./user.entity"

class CreateUserDto extends RegistrationDto {
  @IsString()
  name: string
}

@Controller("auth")
export class AuthController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post("register")
  async register(@Body() dto: CreateUserDto): Promise<User> {
    return this.registrationService.register(dto, User)
  }
}
```

**Option B: Pass entity instance**

```typescript
@Post("register")
async register(@Body() dto: CreateUserDto): Promise<User> {
  const user = Object.assign(new User(), dto)
  return this.registrationService.register(user)
}
```

### 4. Create an authentication endpoint

```typescript
import { Controller, Post, Body } from "@nestjs/common"
import { AuthenticationService, CredentialsDto } from "@neoma/garmr"
import { User } from "./user.entity"

@Controller("auth")
export class AuthController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post("login")
  async login(@Body() dto: CredentialsDto): Promise<User> {
    return this.authenticationService.authenticate(dto, User)
  }
}
```

### 5. Handle events (optional)

```typescript
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { GarmrRegisteredEvent, GarmrAuthenticatedEvent } from "@neoma/garmr"
import { User } from "./user.entity"

@Injectable()
export class UserEventsService {
  @OnEvent("garmr.registered")
  async handleRegistration(event: GarmrRegisteredEvent<User>): Promise<void> {
    await this.emailService.sendWelcome(event.entity.email)
  }

  @OnEvent("garmr.authenticated")
  async handleLogin(event: GarmrAuthenticatedEvent<User>): Promise<void> {
    await this.analyticsService.trackLogin(event.entity.id)
  }
}
```

## API Reference

### RegistrationService

#### `register<T>(dto, EntityClass): Promise<T>`

```typescript
register<T extends Authenticatable>(dto: Omit<T, "id">, EntityClass: new () => T): Promise<T>
```

Registers a new user from a DTO and entity class.

#### `register<T>(entity): Promise<T>`

```typescript
register<T extends Authenticatable>(entity: T): Promise<T>
```

Registers a new user from an entity instance.

**Both methods:**

- Normalize email to lowercase
- Hash password with bcrypt
- Check for duplicate emails (case-insensitive)
- Emit `garmr.registered` event on success

**Throws:** `EmailAlreadyExistsException` (409 Conflict) if email already exists. Safe to let bubble — NestJS handles it automatically.

### AuthenticationService

#### `authenticate<T>(credentials, EntityClass): Promise<T>`

```typescript
authenticate<T extends Authenticatable>(
  credentials: Pick<Authenticatable, "email" | "password">,
  EntityClass: new () => T
): Promise<T>
```

Authenticates a user by validating their credentials.

- Looks up user by email (case-insensitive)
- Validates password with bcrypt
- Emits `garmr.login` event on success

**Throws:** `IncorrectCredentialsException` (401 Unauthorized) if email not found or password incorrect. Safe to let bubble — NestJS handles it automatically.

### DTOs

#### `RegistrationDto`

Base DTO with email and strong password validation. Extend it to add your own fields.

| Property | Validation |
|----------|------------|
| `email` | Must be a valid email address |
| `password` | Min 8 chars, 1 letter, 1 number, 1 symbol |

#### `CredentialsDto`

DTO for login with email and password presence validation (no strength requirement).

| Property | Validation |
|----------|------------|
| `email` | Must be a valid email address |
| `password` | Must be present (non-empty) |

#### `EmailDto`

Standalone email validation. Use for password reset flows.

#### `PasswordDto`

Standalone password presence validation (non-empty). Use for login flows.

#### `NewPasswordDto`

Standalone strong password validation. Use for registration or password change flows.

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `garmr.registered` | `GarmrRegisteredEvent<T>` | Emitted after successful registration |
| `garmr.authenticated` | `GarmrAuthenticatedEvent<T>` | Emitted after successful authentication |

**Important:** Event listeners should handle their own errors. Unhandled errors will result in unhandled promise rejections.

### Interfaces

#### `Authenticatable`

```typescript
interface Authenticatable {
  id: any
  email: string
  password: string
}
```

Implement this on any entity you want to authenticate.

## Error Handling

Garmr exceptions extend `HttpException`, so they're safe to let bubble up. NestJS will automatically return the appropriate HTTP response.

```typescript
// No try/catch needed — NestJS handles errors automatically
@Post("register")
async register(@Body() dto: CreateUserDto): Promise<User> {
  return this.registrationService.register(dto, User)  // 409 if duplicate
}

@Post("login")
async login(@Body() dto: CredentialsDto): Promise<User> {
  return this.authenticationService.authenticate(dto, User)  // 401 if invalid
}
```

If you need custom handling:

```typescript
import { EmailAlreadyExistsException, IncorrectCredentialsException } from "@neoma/garmr"

try {
  await authenticationService.authenticate(credentials, User)
} catch (error) {
  if (error instanceof IncorrectCredentialsException) {
    this.logger.warn(`Failed login attempt: ${error.email}`)
  }
  throw error // Re-throw to let NestJS handle the response
}
```

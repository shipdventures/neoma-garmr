# Garmr - Passwordless Auth for NestJS

## Vision

The definitive NestJS auth library for SaaS MVPs. Opinionated, secure by default, minimal configuration.

**Core philosophy:** No passwords. Magic links + OAuth = simpler, more secure auth without the footguns of password management.

## Roadmap

### Phase 1: Magic Link Auth
- [x] `MagicLinkService` - generate/validate magic link tokens
- [x] `EmailDto` - just email (renamed from InitiateSignupDto)
- [x] Send magic link email (via configurable transport)
- [x] On link click: create user, issue session token
- [ ] Cookie-based sessions (httpOnly, secure, sameSite)

### Phase 2: Authorization
- [ ] Permission-based authorization
- [ ] `@RequiresPermission('read:users')` decorator
- [ ] Permission checking service

### Phase 3: Google OAuth
- [ ] Google OAuth flow
- [ ] Account linking (same email = same account, if verified)
- [ ] Configurable: Google client ID/secret via module options

### Phase 4: API Keys / Personal Access Tokens
- [ ] PAT generation with scoped permissions
- [ ] PAT authentication middleware
- [ ] Revocation

### Phase 5: Session Management
- [ ] List active sessions
- [ ] Revoke sessions
- [ ] Session metadata (device, IP, last active)

## Design Decisions

### Why no passwords?

Password auth requires:
- Secure hashing (bcrypt, cost factors)
- Password strength validation
- Password reset flow
- "Forgot password" emails
- Breach checking

Magic links eliminate all of this. The email IS the verification. Simpler for developers, fewer security footguns.

### Magic link flow

1. User enters email -> `EmailDto`
2. Token generated: `{ email, aud: "magic-link", exp }` (15 min expiry)
3. Email sent with magic link
4. User clicks link -> lands on app, token validated (checks `aud` claim)
5. Account created (if new) or existing user found
6. Session token issued with `{ sub: userId, aud: "session" }`
7. Bearer token used for subsequent requests (audience validated)

### Account linking with OAuth

- User signs up via magic link with `alice@example.com`
- Later clicks "Sign in with Google" using same email
- Accounts are linked (same user, multiple auth methods)
- Only works because magic link already verified email ownership

### Duplicate signup handling

- User enters email that's already registered
- Send magic link anyway (don't reveal if account exists)
- If they click, they get logged in (not a new signup)
- Prevents email enumeration attacks

## What Was Removed

The following password-based components have been removed:
- `PasswordService` (bcrypt hashing)
- `RegistrationService`
- `CredentialsController` and `SessionsController`
- Password-related DTOs (credentials, registration, password, new-password)
- `password` field from `Authenticatable` interface

Password auth may be added back as an optional module for enterprise/compliance needs.

## References

- `archive/schematics` branch: Previous schematic-based approach (preserved for reference)
- `wip/auth-cookie-support` branch: Cookie + Bearer middleware work (some concepts reusable)

# Garmr - Passwordless Auth for NestJS

## Vision

The definitive NestJS auth library for SaaS MVPs. Opinionated, secure by default, minimal configuration.

**Core philosophy:** No passwords. Magic links + OAuth = simpler, more secure auth without the footguns of password management.

## Roadmap

### Phase 1: Magic Link Auth
- [ ] `MagicLinkService` - generate/validate magic link tokens
- [ ] `InitiateSignupDto` - just email
- [ ] Send magic link email (via configurable transport)
- [ ] `EmailVerificationGuard` + `@VerifiedEmail()` decorator
- [ ] On link click: create user, issue session token
- [ ] Cookie-based sessions (httpOnly, secure, sameSite)

### Phase 2: Google OAuth
- [ ] Google OAuth flow
- [ ] Account linking (same email = same account, if verified)
- [ ] Configurable: Google client ID/secret via module options

### Phase 3: Authorization
- [ ] Permission-based authorization
- [ ] `@RequiresPermission('read:users')` decorator
- [ ] Permission checking service

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

1. User enters email -> `InitiateSignupDto`
2. Token generated: `{ email, exp }` (no password in token)
3. Email sent with magic link
4. User clicks link -> lands on app, token validated
5. Account created (if new) or session issued (if existing)
6. Cookie set with session token

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

## What's Being Removed

The `feature/passwordless` branch removes:
- `PasswordService` (bcrypt hashing)
- Password-based `RegistrationService`
- Password-based `AuthenticationService.authenticateCredentials()`
- Related DTOs and tests

Password auth may be added back as an optional module for enterprise/compliance needs.

## References

- `archive/schematics` branch: Previous schematic-based approach (preserved for reference)
- `wip/auth-cookie-support` branch: Cookie + Bearer middleware work (some concepts reusable)

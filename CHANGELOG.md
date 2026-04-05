# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `UnauthorizedRedirectException` for server-rendered apps — carries redirect metadata via `getRedirect()` for exception filters to handle
- `Authenticated` guard accepts an optional redirect URL: `new Authenticated("/login")` throws `UnauthorizedRedirectException` (303) instead of plain `UnauthorizedException`

### Fixed
- Express type augmentation for `req.principal` now published in package output (was excluded because file used `.d.ts` extension)
- E2E test failures no longer silently pass in CI (removed `--passWithNoTests` flag)

## [0.6.0] - 2026-04-02

### Changed
- **Breaking**: Removed `BearerAuthenticationMiddleware` and `CookieAuthenticationMiddleware` from barrel exports (internal, applied automatically by `GarmrModule`)
- Moved NestJS framework packages to `peerDependencies` in published package
- Added `cookie`, `jsonwebtoken`, `nodemailer` as direct library dependencies
- Added `@nestjs/typeorm`, `@nestjs/event-emitter`, `@nestjs/platform-express`, `class-validator`, `reflect-metadata`, `rxjs`, `typeorm` as peer dependencies
- Reorganized barrel exports with section comments for clarity
- Updated README peer dependency install command

### Removed
- `bcrypt` dependency and bcrypt test matcher (unused since passwordless migration)
- `@nestjs/mapped-types` dependency (unused)

## [0.5.0] - 2026-03-27

### Added
- Separate magic link email templates for login (`welcomeBack`) vs registration (`welcome`)
- `POST /logout` endpoint exercising `SessionService.clear()`
- CSRF documentation for `SameSite=None` on `CookieOptions`

### Changed
- **Breaking**: `MailerOptions` now uses `welcome`/`welcomeBack` template objects instead of single `html`/`subject` fields
- `MagicLinkService.send()` checks user existence to select the appropriate template
- Replace `as any` with `FindOptionsWhere<T>` on all repository queries

## [0.4.1] - 2026-03-20

### Fixed
- Publish configuration for npm

## [0.4.0] - 2026-03-20

### Added
- Passwordless magic link authentication (`MagicLinkService.send()`, `MagicLinkService.verify()`)
- Cookie-based sessions (httpOnly, Secure, SameSite=Lax) via `SessionService`
- Dual transport: `BearerAuthenticationMiddleware` and `CookieAuthenticationMiddleware`
- JWT audience (`aud`) claim validation to prevent token type confusion
- `MAGIC_LINK_AUDIENCE` and `SESSION_AUDIENCE` constants
- `InvalidMagicLinkTokenException` for invalid/wrong audience tokens
- Permission-based authorization with wildcard matching (`*`, `*:resource`, `action:*`)
- `@RequiresPermission` (AND) and `@RequiresAnyPermission` (OR) decorators
- `RequiresPermissionGuard` combining authentication and permission checks
- `PermissionDeniedException` (403) with detailed error metadata
- Optional `permissions` field on `Authenticatable` interface
- Permission format validation at decoration time and runtime

### Removed
- Password-based authentication (`PasswordService`, `RegistrationService`, `CredentialsController`, `SessionsController`)
- `bcrypt` password hashing
- Password-related DTOs and validation

### Changed
- Authentication flow now uses magic links instead of email/password
- Split single authentication middleware into bearer and cookie middlewares
- Bearer takes priority when both auth methods are present

## [0.3.3] - 2025-11-13

### Fixed
- Update setup script to replace literal `garmr` path references
- Fix broken path mappings in tsconfig.json and Jest configs after setup
- Remove circular dependency by replacing npm package import with @lib path alias

## [0.3.2] - 2025-11-13

### Added
- `@neoma/managed-app` dependency for better error handling and debugging support

### Changed
- Updated test:e2e script to use NEOMA_MANAGED_APP_MODULE_PATH environment variable
- Simplified Jest setup by removing build-module.js dependency
- Added @lib path alias for cleaner imports to package template source

## [0.3.1] - 2025-11-12

### Fixed
- Prevent template repository from publishing to npm when tagged
- Publish job now only runs for packages created from template, not template itself

## [0.3.0] - 2025-11-12

### Fixed
- Replace `garmr` placeholder with buildable `garmr` name
- Update setup script to rename `libs/garmr` instead of `libs/PACKAGE_NAME`
- Template now builds, tests, lints, and validates successfully

### Added
- Publish dry-run test in CI workflow to validate package structure
- Complete package-lock.json for reproducible builds

### Changed
- Directory structure uses `libs/garmr` instead of `libs/PACKAGE_NAME`
- All imports and references updated to use `@neoma/garmr`

## [0.2.0] - 2025-11-12

### Added
- Build module on test functionality
- Comprehensive testing infrastructure with fixtures
- Example module with unit tests

### Fixed
- INestApplication typing issues
- Application specialisation improvements

## [0.1.0] - Initial Release

### Added
- Initial Neoma package template structure
- NestJS module scaffolding
- Testing setup with Jest
- ESLint and Prettier configuration
- TypeScript configuration
- Setup script for placeholder replacement
- Comprehensive README documentation

[Unreleased]: https://github.com/shipdventures/neoma-garmr/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/shipdventures/neoma-garmr/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shipdventures/neoma-garmr/releases/tag/v0.1.0
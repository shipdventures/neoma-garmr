# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/shipdventures/neoma-garmr/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/shipdventures/neoma-garmr/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shipdventures/neoma-garmr/releases/tag/v0.1.0
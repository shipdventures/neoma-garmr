import "./types/express"

// Module & Configuration
export * from "./garmr.module"
export * from "./garmr.options"

// Interface consumers implement
export * from "./interfaces/authenticatable.interface"

// Services injected via DI
export * from "./services/authentication.service"
export * from "./services/magic-link.service"
export * from "./services/permission.service"
export * from "./services/session.service"
export * from "./services/token.service"

// DTO for request validation
export * from "./dtos/email.dto"

// Decorators used in consumer controllers
export * from "./decorators/principal.decorator"
export * from "./decorators/requires-permission.decorator"
export * from "./decorators/requires-any-permission.decorator"

// Guards used directly by consumers
export * from "./guards/authenticated.guard"
export * from "./guards/requires-permission.guard"

// Exceptions consumers may catch or reference in filters
export * from "./exceptions/incorrect-credentials.exception"
export * from "./exceptions/invalid-credentials.exception"
export * from "./exceptions/invalid-magic-link-token.exception"
export * from "./exceptions/token-failed-verification.exception"
export * from "./exceptions/token-malformed.exception"
export * from "./exceptions/permission-denied.exception"

// Events consumers listen for via @OnEvent
export * from "./events/garmr-registered.event"
export * from "./events/garmr-authenticated.event"

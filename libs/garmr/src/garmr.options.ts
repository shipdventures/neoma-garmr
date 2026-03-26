import * as jwt from "jsonwebtoken"

import { Authenticatable } from "./interfaces/authenticatable.interface"

export const GARMR_OPTIONS = Symbol("GARMR_OPTIONS")

/**
 * Subject and HTML body for a magic link email template.
 */
export interface MailerTemplate {
  /** Email subject line */
  subject: string
  /** HTML template with {{token}} placeholder */
  html: string
}

/**
 * Configuration options for the mailer.
 */
export interface MailerOptions {
  /** SMTP host */
  host: string
  /** SMTP port */
  port: number
  /** From address for emails */
  from: string
  /** Template sent to new users (registration) */
  welcome: MailerTemplate
  /** Template sent to existing users (login) */
  welcomeBack: MailerTemplate
  /** SMTP authentication credentials */
  auth?: { user: string; pass: string }
}

/**
 * Configuration options for session cookies.
 */
export interface CookieOptions {
  /** Cookie name (default: "garmr.sid") */
  name?: string
  /** Cookie domain */
  domain?: string
  /** Cookie path (default: "/") */
  path?: string
  /** Secure flag — only send over HTTPS (default: true) */
  secure?: boolean
  /** SameSite attribute (default: "lax") */
  sameSite?: "strict" | "lax" | "none"
}

/**
 * Configuration options for the Garmr authentication module.
 *
 * @typeParam T - The entity class implementing Authenticatable
 *
 * @example
 * ```typescript
 * GarmrModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '1h',
 *   entity: User,
 *   mailer: {
 *     host: 'smtp.example.com',
 *     port: 587,
 *     from: 'noreply@example.com',
 *     welcome: {
 *       subject: 'Welcome to MyApp',
 *       html: '<a href="https://myapp.com/auth?token={{token}}">Sign up</a>',
 *     },
 *     welcomeBack: {
 *       subject: 'Sign in to MyApp',
 *       html: '<a href="https://myapp.com/auth?token={{token}}">Sign in</a>',
 *     },
 *   },
 * })
 * ```
 */
export interface GarmrOptions<T extends Authenticatable = Authenticatable> {
  /** Secret key used to sign and verify JWTs */
  secret: string
  /** Token expiration time (e.g., "1h", "7d", or seconds as number) */
  expiresIn: jwt.SignOptions["expiresIn"]
  /** The entity class used for registration, authentication, and principal lookup */
  entity: new () => T
  /** Mailer configuration for magic links */
  mailer: MailerOptions
  /** Session cookie configuration */
  cookie?: CookieOptions
}

import * as jwt from "jsonwebtoken"
import { Authenticatable } from "./interfaces/authenticatable.interface"

export const GARMR_OPTIONS = Symbol("GARMR_OPTIONS")

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
}

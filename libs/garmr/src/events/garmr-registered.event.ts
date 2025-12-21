import { Authenticatable } from "@lib/interfaces/authenticatable.interface"

/**
 * Emitted after successful registration.
 *
 * @example
 * ```typescript
 * @OnEvent('garmr.registered')
 * async handleRegistered(event: GarmrRegisteredEvent<User>) {
 *   await this.emailService.sendWelcome(event.entity.email)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class GarmrRegisteredEvent<T extends Authenticatable> {
  public static readonly EVENT_NAME = "garmr.registered"
  public constructor(public readonly entity: T) {}
}

import { Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Emitted after successful authentication.
 *
 * @example
 * ```typescript
 * @OnEvent('garmr.authenticated')
 * async handleAuthenticated(event: GarmrAuthenticatedEvent<User>) {
 *   await this.analyticsService.trackLogin(event.entity.id)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class GarmrAuthenticatedEvent<T extends Authenticatable> {
  public static readonly EVENT_NAME = "garmr.authenticated"
  public constructor(public readonly entity: T) {}
}

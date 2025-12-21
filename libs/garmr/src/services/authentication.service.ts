import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DataSource } from "typeorm"
import { Authenticatable } from "@lib/interfaces/authenticatable.interface"
import { IncorrectCredentialsException } from "@lib/exceptions/incorrect-credentials.exception"
import { GarmrAuthenticatedEvent } from "@lib/events/garmr-authenticated.event"
import { GarmrOptions, GARMR_OPTIONS } from "@lib/garmr.options"
import { PasswordService } from "./password.service"

/**
 * Handles user authentication by validating credentials against stored entities.
 */
@Injectable()
export class AuthenticationService {
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Authenticates a user by validating their credentials.
   *
   * - Looks up user by email (case-insensitive)
   * - Validates password with bcrypt
   * - Emits `garmr.authenticated` event with {@link GarmrAuthenticatedEvent} on success
   *
   * @param credentials - Object with email and password
   * @returns The authenticated entity
   * @throws {@link IncorrectCredentialsException} if email not found or password incorrect.
   *   Safe to let bubble — NestJS will return a 401 Unauthorized response automatically.
   *
   * @example
   * ```typescript
   * const user = await authenticationService.authenticate({
   *   email: 'john@example.com',
   *   password: 'secret123',
   * })
   * ```
   *
   * @fires garmr.authenticated
   * @see {@link GarmrAuthenticatedEvent} for event payload structure
   */
  public async authenticate<T extends Authenticatable>(
    credentials: Pick<Authenticatable, "email" | "password">,
  ): Promise<T> {
    const repo = this.datasource.getRepository<T>(this.options.entity)
    const entity = await repo.findOne({
      where: { email: credentials.email.toLowerCase() } as any,
    })
    if (
      !entity ||
      !this.passwordService.compare(credentials.password, entity.password)
    ) {
      throw new IncorrectCredentialsException(credentials.email)
    }
    this.eventEmitter.emit(
      GarmrAuthenticatedEvent.EVENT_NAME,
      new GarmrAuthenticatedEvent(entity),
    )
    return entity
  }
}

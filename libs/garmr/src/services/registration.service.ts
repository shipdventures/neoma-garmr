import { Authenticatable } from "@lib/interfaces/authenticatable.interface"
import { GarmrRegisteredEvent } from "@lib/events/garmr-registered.event"
import { EmailAlreadyExistsException } from "@lib/exceptions/email-already-exists.exception"
import { GarmrOptions, GARMR_OPTIONS } from "@lib/garmr.options"
import { Inject, Injectable } from "@nestjs/common"
import { DataSource } from "typeorm"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { PasswordService } from "./password.service"

/**
 * Handles user registration with email normalization and password hashing.
 */
@Injectable()
export class RegistrationService {
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Registers a new user.
   *
   * - Normalizes email to lowercase
   * - Hashes password with bcrypt
   * - Emits `garmr.registered` event with {@link GarmrRegisteredEvent} containing the saved entity
   *
   * @param dto - Object with email and password
   * @returns The saved entity with hashed password
   * @throws {@link EmailAlreadyExistsException} if email is already registered (case-insensitive).
   *   Safe to let bubble — NestJS will return a 409 Conflict response automatically.
   *
   * @example
   * ```typescript
   * const saved = await registrationService.register({
   *   email: 'John@Example.com',
   *   password: 'secret123',
   * })
   * // saved.email === 'john@example.com'
   * // saved.password === '$2b$10$...' (hashed)
   * ```
   *
   * @fires garmr.registered
   * @see {@link GarmrRegisteredEvent} for event payload structure
   */
  public async register<T extends Authenticatable>(
    dto: Omit<T, "id">,
  ): Promise<T> {
    const repo = this.datasource.getRepository<T>(this.options.entity)
    const email = dto.email.toLowerCase()

    if (await repo.findOne({ where: { email } as any })) {
      throw new EmailAlreadyExistsException(dto.email)
    }

    const toSave = repo.create({
      ...dto,
      email,
      password: this.passwordService.hash(dto.password),
    } as T)

    const saved = await repo.save(toSave)

    this.eventEmitter.emit(
      GarmrRegisteredEvent.EVENT_NAME,
      new GarmrRegisteredEvent(saved),
    )

    return saved
  }
}

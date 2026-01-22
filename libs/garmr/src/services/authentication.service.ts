import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import * as jsonwebtoken from "jsonwebtoken"
import { DataSource } from "typeorm"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { PasswordService } from "./password.service"

/**
 * Handles user authentication by validating credentials against stored entities.
 */
@Injectable()
export class AuthenticationService {
  /**
   * Creates an instance of AuthenticationService.
   *
   * @param options - Garmr configuration options
   * @param options.entity - The entity class representing authenticatable users
   * @param options.secret - Secret key for verifying JWT tokens
   * @param datasource - TypeORM DataSource for database access
   * @param eventEmitter - Event emitter for publishing authentication events
   * @param passwordService - Service for hashing and comparing passwords
   */
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Authenticates a user by validating their credentials (email and password, or bearer token).
   *
   * Supports two authentication modes:
   *
   * **Credentials mode** - Pass an object with `email` and `password`:
   * - Email lookup is case-insensitive (`John@Example.com` matches `john@example.com`)
   * - Password is validated against the stored bcrypt hash
   *
   * **Bearer mode** - Pass an Authorization header string:
   * - Scheme is case-insensitive (`Bearer`, `bearer`, `BEARER` all work)
   * - Token is verified against the configured secret
   * - User is looked up by the `sub` claim in the JWT payload
   *
   * @param credentials - Email/password object or Authorization header string
   * @returns The authenticated entity
   * @throws {@link IncorrectCredentialsException} if email not found, password wrong, or user in token doesn't exist
   * @throws {@link InvalidCredentialsException} if token isn't provided, scheme is wrong, token is malformed/expired/not-yet-valid, or missing `sub` claim
   *
   * @example
   * ```typescript
   * // With email/password
   * const user = await authenticationService.authenticate({
   *   email: 'john@example.com',
   *   password: 'secret123',
   * })
   *
   * // Email is case-insensitive
   * const user = await authenticationService.authenticate({
   *   email: 'JOHN@EXAMPLE.COM',
   *   password: 'secret123',
   * })
   *
   * // With bearer token (from Authorization header)
   * const user = await authenticationService.authenticate('Bearer eyJhbG...')
   *
   * // Bearer scheme is case-insensitive
   * const user = await authenticationService.authenticate('bearer eyJhbG...')
   * ```
   *
   * @fires garmr.authenticated
   * @see {@link GarmrAuthenticatedEvent} for event payload structure
   */
  public async authenticate<T extends Authenticatable>(
    credentials: string | Pick<Authenticatable, "email" | "password">,
  ): Promise<T> {
    return typeof credentials === "string"
      ? this.authenticateJwt(credentials)
      : this.authenticateCredentials(credentials)
  }

  /**
   * Authenticates via email and password.
   */
  private async authenticateCredentials<T extends Authenticatable>(
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

  /**
   * Authenticates via Bearer token in Authorization header format.
   */
  private async authenticateJwt<T extends Authenticatable>(
    token: string,
  ): Promise<T> {
    if (!token) {
      throw new InvalidCredentialsException("Invalid JWT: JWT not provided")
    }

    let jwt: jsonwebtoken.JwtPayload
    try {
      jwt = jsonwebtoken.verify(
        token,
        this.options.secret,
      ) as jsonwebtoken.JwtPayload
    } catch (err) {
      if (err instanceof jsonwebtoken.NotBeforeError) {
        throw new InvalidCredentialsException(
          `Invalid JWT: Not active yet (nbf claim)`,
        )
      }

      if (err instanceof jsonwebtoken.TokenExpiredError) {
        throw new InvalidCredentialsException(`Invalid JWT: Token expired`)
      }

      throw new InvalidCredentialsException(
        "Invalid JWT: Invalid JWT signature",
      )
    }

    const { sub } = jwt
    if (!sub) {
      throw new InvalidCredentialsException(
        "Invalid JWT payload: missing sub claim",
      )
    }

    const repo = this.datasource.getRepository<T>(this.options.entity)
    const entity = await repo.findOne({
      where: { id: sub } as any,
    })

    if (!entity) {
      throw new IncorrectCredentialsException(sub)
    }

    this.eventEmitter.emit(
      GarmrAuthenticatedEvent.EVENT_NAME,
      new GarmrAuthenticatedEvent(entity),
    )

    return entity
  }
}

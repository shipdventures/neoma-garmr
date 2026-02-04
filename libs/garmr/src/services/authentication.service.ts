import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import * as jsonwebtoken from "jsonwebtoken"
import { DataSource } from "typeorm"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { SESSION_AUDIENCE } from "./magic-link.service"

/**
 * Handles user authentication by validating bearer tokens against stored entities.
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
   */
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Authenticates a user by validating a bearer token.
   *
   * - Scheme is case-insensitive (`Bearer`, `bearer`, `BEARER` all work)
   * - Token is verified against the configured secret
   * - User is looked up by the `sub` claim in the JWT payload
   *
   * @param header - Authorization header string (e.g., "Bearer eyJhbG...")
   * @returns The authenticated entity
   * @throws {@link IncorrectCredentialsException} if user in token doesn't exist
   * @throws {@link InvalidCredentialsException} if token isn't provided, scheme is wrong, token is malformed/expired/not-yet-valid, or missing `sub` claim
   *
   * @example
   * ```typescript
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
    header: string,
  ): Promise<T> {
    if (header === null || header === undefined) {
      throw new InvalidCredentialsException(
        "Invalid authentication argument. Expected Bearer but got null or undefined",
      )
    }

    return this.authenticateBearer<T>(header)
  }

  /**
   * Authenticates via Bearer token in Authorization header format.
   */
  private async authenticateBearer<T extends Authenticatable>(
    header: string,
  ): Promise<T> {
    const [scheme, token] = header.split(/\s+/)

    if (scheme.toLowerCase() !== "bearer") {
      throw new InvalidCredentialsException(
        `Invalid authentication token scheme. Expected Bearer but got "${scheme}"`,
      )
    }

    if (!token) {
      throw new InvalidCredentialsException(
        "Invalid authentication header format",
      )
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

    if (jwt.aud !== SESSION_AUDIENCE) {
      throw new InvalidCredentialsException("Invalid JWT: wrong audience")
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

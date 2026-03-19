import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DataSource } from "typeorm"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { TokenService } from "./token.service"

/**
 * Handles user authentication by validating session tokens against stored entities.
 *
 * Accepts a raw JWT token string (not a full Authorization header).
 * Bearer/Cookie extraction is handled by the respective middlewares.
 */
@Injectable()
export class AuthenticationService {
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly tokenService: TokenService,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Authenticates a user by validating a raw JWT session token.
   *
   * - Token is verified via TokenService (HS256 algorithm enforced)
   * - Audience must be "session"
   * - User is looked up by the `sub` claim
   *
   * @param token - Raw JWT token string
   * @returns The authenticated entity
   * @throws {@link InvalidCredentialsException} if token is null/undefined, invalid, expired, wrong audience, or missing sub
   * @throws {@link IncorrectCredentialsException} if user in token doesn't exist
   *
   * @fires garmr.authenticated
   */
  public async authenticate<T extends Authenticatable>(
    token: string,
  ): Promise<T> {
    if (token === null || token === undefined) {
      throw new InvalidCredentialsException("token cannot be null or undefined")
    }

    let jwt: Record<string, any>
    try {
      jwt = this.tokenService.verify(token)
    } catch {
      throw new InvalidCredentialsException(
        "Invalid or expired authentication token",
      )
    }

    if (jwt.aud !== SESSION_AUDIENCE) {
      throw new InvalidCredentialsException("Invalid JWT: wrong audience")
    }

    const sub = jwt.sub as string | undefined
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

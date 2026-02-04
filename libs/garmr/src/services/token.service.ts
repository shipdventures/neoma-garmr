import { Inject, Injectable } from "@nestjs/common"
import * as jwt from "jsonwebtoken"
import type { StringValue } from "ms"

import { TokenFailedVerificationException } from "../exceptions/token-failed-verification.exception"
import { TokenMalformedException } from "../exceptions/token-malformed.exception"
import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"

/**
 * Service for issuing and managing JSON Web Tokens.
 *
 * @example
 * ```typescript
 * const user = await authService.authenticate(credentials, User)
 * const token = tokenService.issue(user)
 * res.cookie('token', token, { httpOnly: true })
 * ```
 */
@Injectable()
export class TokenService {
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
  ) {}

  /**
   * Issues a signed JWT with the given payload.
   *
   * @param payload - The claims to include in the token
   * @param options - Optional signing options
   * @param options.expiresIn - Override the default expiration time
   * @returns Object containing the signed token and decoded payload
   */
  public issue(
    payload: Record<string, any>,
    options?: { expiresIn?: StringValue | number },
  ): { token: string; payload: jwt.JwtPayload } {
    const token = jwt.sign(payload, this.options.secret, {
      expiresIn: options?.expiresIn ?? this.options.expiresIn,
      notBefore: "0s",
    })
    const decoded = jwt.decode(token) as jwt.JwtPayload

    return { token, payload: decoded }
  }

  /**
   * Verifies a JWT and returns the payload.
   *
   * @param token - The JWT string to verify
   * @returns The verified JWT payload
   *
   * @example
   * ```typescript
   * const payload = tokenService.verify(token)
   * const user = await userRepo.findOne({ where: { id: payload.sub } })
   * ```
   */
  public verify(token: string): jwt.JwtPayload {
    try {
      return jwt.verify(token, this.options.secret) as jwt.JwtPayload
    } catch (error) {
      throw new TokenFailedVerificationException(error as jwt.JsonWebTokenError)
    }
  }

  /**
   * Decodes a JWT without verifying its signature.
   *
   * @param token - The JWT string to decode
   * @returns The decoded JWT payload
   *
   * @example
   * ```typescript
   * const payload = tokenService.decode(token)
   * ```
   */
  public decode(token: string): jwt.JwtPayload {
    const payload = jwt.decode(token) as jwt.JwtPayload | null
    if (!payload) {
      throw new TokenMalformedException()
    }
    return payload
  }
}

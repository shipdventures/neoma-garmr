import { Inject, Injectable } from "@nestjs/common"
import * as jwt from "jsonwebtoken"

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
   * Issues a signed JWT for an authenticated entity.
   *
   * @param authenticated - Any object with an `id` property
   * @returns Object containing the signed JWT token and its decoded payload
   *
   * @example
   * ```typescript
   * const { token, payload } = tokenService.issue(user)
   * // token: "eyJhbGciOiJIUzI1NiIs..."
   * // payload: { sub: "user-uuid", iat: 1234567890, nbf: 1234567890, exp: 1234571490 }
   *
   * // Set cookie with matching expiry
   * res.cookie('token', token, {
   *   httpOnly: true,
   *   expires: new Date(payload.exp * 1000),
   * })
   * ```
   */
  public issue(authenticated: { id: any }): {
    token: string
    payload: { sub: string; iat: number; nbf: number; exp: number }
  } {
    const token = jwt.sign({ sub: authenticated.id }, this.options.secret, {
      expiresIn: this.options.expiresIn,
      notBefore: "0s",
    })
    const payload = jwt.decode(token) as jwt.JwtPayload

    return {
      token,
      payload: {
        sub: payload.sub!,
        iat: payload.iat!,
        nbf: payload.nbf!,
        exp: payload.exp!,
      },
    }
  }

  /**
   * Verifies a JWT and returns the authenticated entity reference.
   *
   * @param token - The JWT string to verify
   * @returns Object with `id` property from the token's `sub` claim
   *
   * @example
   * ```typescript
   * const { id } = tokenService.verify(token)
   * const user = await userRepo.findOne({ where: { id } })
   * ```
   */
  public verify(token: string): { id: any } {
    try {
      const payload = jwt.verify(token, this.options.secret) as jwt.JwtPayload
      return { id: payload.sub }
    } catch (error) {
      throw new TokenFailedVerificationException(error as jwt.JsonWebTokenError)
    }
  }

  /**
   * Decodes a JWT without verifying its signature.
   *
   * @param token - The JWT string to decode
   * @returns Object with `id` property from the token's `sub` claim
   *
   * @example
   * ```typescript
   * const { id } = tokenService.decode(token)
   * ```
   */
  public decode(token: string): { id: any } {
    const payload = jwt.decode(token) as jwt.JwtPayload | null
    if (!payload) {
      throw new TokenMalformedException()
    }
    return { id: payload.sub }
  }
}

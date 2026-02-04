import { HttpStatus, UnauthorizedException } from "@nestjs/common"

/**
 * Thrown when a magic link token is invalid (wrong audience, missing claims).
 *
 * Returns HTTP 401 Unauthorized.
 *
 * @example
 * ```typescript
 * if (payload.aud !== MAGIC_LINK_AUDIENCE) {
 *   throw new InvalidMagicLinkTokenException('invalid audience')
 * }
 * ```
 */
export class InvalidMagicLinkTokenException extends UnauthorizedException {
  /**
   * @param reason - Description of why the token is invalid
   */
  public constructor(public readonly reason: string) {
    super(`Invalid magic link token: ${reason}`)
  }

  /**
   * Returns the error response body.
   *
   * @returns Object containing statusCode (401), message, reason, and error
   */
  public getResponse(): object {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: this.message,
      reason: this.reason,
      error: "Unauthorized",
    }
  }
}

import { HttpException, HttpStatus } from "@nestjs/common"
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken"

/**
 * Thrown when a JWT fails verification (invalid signature, expired, malformed).
 *
 * Returns 401 Unauthorized.
 */
export class TokenFailedVerificationException extends HttpException {
  public constructor(cause: JsonWebTokenError | TokenExpiredError) {
    super(
      cause instanceof TokenExpiredError
        ? "Token has expired."
        : "Token signature is invalid.",
      HttpStatus.UNAUTHORIZED,
      { cause },
    )
  }

  public get reason(): "expired" | "invalid" {
    return this.cause instanceof TokenExpiredError ? "expired" : "invalid"
  }
}

import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a JWT cannot be decoded (malformed structure).
 *
 * Returns 401 Unauthorized.
 */
export class TokenMalformedException extends HttpException {
  public constructor() {
    super("Token is malformed.", HttpStatus.UNAUTHORIZED)
  }
}

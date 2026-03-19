import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when authentication fails because the user was not found.
 *
 * Returns HTTP 401 Unauthorized. The identifier is available on the exception
 * for server-side logging/auditing but is NOT included in the response body.
 *
 * @example
 * ```typescript
 * try {
 *   await authenticationService.authenticate(token)
 * } catch (error) {
 *   if (error instanceof IncorrectCredentialsException) {
 *     this.logger.warn(`Failed auth for: ${error.identifier}`)
 *   }
 * }
 * ```
 */
export class IncorrectCredentialsException extends HttpException {
  /**
   * @param identifier - The identifier used in the failed authentication attempt,
   * e.g. an email or and id
   */
  public constructor(public readonly identifier: string) {
    super(
      `Incorrect credentials provided for the identifier ${identifier}.`,
      HttpStatus.UNAUTHORIZED,
    )
  }

  /**
   * Returns the error response body.
   *
   * @returns Object containing statusCode (401) and message
   */
  public getResponse(): Record<string, any> {
    return {
      statusCode: this.getStatus(),
      message: this.message,
    }
  }
}

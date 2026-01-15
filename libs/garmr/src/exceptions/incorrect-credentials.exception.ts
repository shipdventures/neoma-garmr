import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when authentication fails due to incorrect credentials.
 *
 * Returns HTTP 401 Unauthorized. The email is available on the exception
 * for server-side logging/auditing but is also included in the response.
 *
 * @example
 * ```typescript
 * try {
 *   await authenticationService.authenticate(credentials, User)
 * } catch (error) {
 *   if (error instanceof IncorrectCredentialsException) {
 *     this.logger.warn(`Failed login attempt: ${error.identifier}`)
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
   * @returns Object containing statusCode (401), message, and email
   */
  public getResponse(): Record<string, any> {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      identifier: this.identifier,
    }
  }
}

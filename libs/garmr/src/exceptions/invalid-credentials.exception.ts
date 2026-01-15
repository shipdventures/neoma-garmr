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
 *     this.logger.warn(`Failed login attempt: ${error.email}`)
 *   }
 * }
 * ```
 */
export class InvalidCredentialsException extends HttpException {
  /**
   * @param email - The email address used in the failed authentication attempt
   */
  public constructor(public readonly message: string) {
    super(message, HttpStatus.UNAUTHORIZED)
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
    }
  }
}

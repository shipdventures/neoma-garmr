import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when authentication fails due to invalid credentials format or token.
 *
 * Returns HTTP 401 Unauthorized.
 */
export class InvalidCredentialsException extends HttpException {
  /**
   * @param message - Description of why the credentials are invalid
   */
  public constructor(public readonly message: string) {
    super(message, HttpStatus.UNAUTHORIZED)
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

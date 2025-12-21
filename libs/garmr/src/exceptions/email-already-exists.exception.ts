import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when attempting to register with an email that already exists.
 *
 * Returns HTTP 409 Conflict with the duplicate email in the response body.
 *
 * @example
 * ```typescript
 * try {
 *   await registrationService.register(user)
 * } catch (error) {
 *   if (error instanceof EmailAlreadyExistsException) {
 *     console.log(`Duplicate email: ${error.email}`)
 *   }
 * }
 * ```
 */
export class EmailAlreadyExistsException extends HttpException {
  /**
   * @param email - The email address that already exists
   */
  public constructor(public readonly email: string) {
    super(`The email ${email} is already registered.`, HttpStatus.CONFLICT)
  }

  /**
   * Returns the error response body.
   *
   * @returns Object containing statusCode (409), message, and email
   */
  public getResponse(): object {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: this.message,
      email: this.email,
    }
  }
}

import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a principal lacks the required permission to perform an action.
 *
 * Returns HTTP 403 Forbidden. The required permission is available on the
 * exception for server-side logging/auditing and is included in the response.
 *
 * @example
 * ```typescript
 * try {
 *   permissionService.requirePermission(user, 'delete:users')
 * } catch (error) {
 *   if (error instanceof PermissionDeniedException) {
 *     this.logger.warn(`Permission denied: ${error.permission}`)
 *   }
 * }
 * ```
 */
export class PermissionDeniedException extends HttpException {
  /**
   * @param permission - The permission that was required but not granted
   */
  public constructor(public readonly permission: string) {
    super(`Permission denied: ${permission} is required.`, HttpStatus.FORBIDDEN)
  }

  /**
   * Returns the error response body.
   *
   * @returns Object containing statusCode (403), message, and permission
   */
  public getResponse(): Record<string, any> {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      permission: this.permission,
    }
  }
}

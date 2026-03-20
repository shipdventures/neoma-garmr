import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a principal lacks the required permission to perform an action.
 *
 * Returns HTTP 403 Forbidden. The required permissions, principal identifier,
 * and principal's current permissions are available on the exception for
 * server-side logging/auditing.
 *
 * @example
 * ```typescript
 * try {
 *   permissionService.requirePermission(user, 'delete:users')
 * } catch (error) {
 *   if (error instanceof PermissionDeniedException) {
 *     this.logger.warn(`Permission denied for ${error.identifier}`, {
 *       required: error.requiredPermissions,
 *       had: error.permissions,
 *     })
 *   }
 * }
 * ```
 */
export class PermissionDeniedException extends HttpException {
  /**
   * @param requiredPermissions - The permissions that were required but not granted
   * @param mode - Whether all permissions were required ("all") or any one of them ("any")
   * @param identifier - The identifier of the principal who was denied, for logging
   * @param permissions - The permissions the principal had at the time, for logging
   */
  public constructor(
    public readonly requiredPermissions: string[],
    public readonly mode: "all" | "any",
    public readonly identifier?: any,
    public readonly permissions?: string[],
  ) {
    const separator = mode === "all" ? ", " : " | "
    super(
      `Permission denied: ${requiredPermissions.join(separator)} is required.`,
      HttpStatus.FORBIDDEN,
    )
  }

  /**
   * Returns the error response body.
   *
   * @returns Object containing statusCode (403), message, requiredPermissions, and permissions
   */
  public getResponse(): Record<string, any> {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      requiredPermissions: this.requiredPermissions,
      permissions: this.permissions ?? [],
    }
  }
}

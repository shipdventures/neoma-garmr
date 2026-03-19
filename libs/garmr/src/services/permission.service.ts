import { Injectable } from "@nestjs/common"

import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Service for checking and enforcing permissions on principals.
 *
 * Supports permission strings in the format `action:resource` with wildcard matching:
 * - `*` → matches any permission (superuser)
 * - `*:resource` → matches any action on a specific resource
 * - `action:*` → matches a specific action on any resource
 *
 * @example
 * ```typescript
 * // Check if user has permission
 * if (permissionService.hasPermission(user, 'read:users')) {
 *   // allow access
 * }
 *
 * // Throw if permission is missing
 * permissionService.requirePermission(user, 'delete:users')
 * ```
 */
@Injectable()
export class PermissionService {
  /**
   * Checks if a principal has a specific permission.
   *
   * @param principal - The authenticated entity to check
   * @param permission - The permission to check for
   * @returns true if the principal has the permission, false otherwise
   */
  public hasPermission(
    principal: Authenticatable,
    permission: string,
  ): boolean {
    const permissions = principal.permissions ?? []
    return permissions.some((p) => this.matchesPermission(p, permission))
  }

  /**
   * Checks if a principal has all of the specified permissions.
   *
   * @param principal - The authenticated entity to check
   * @param permissions - The permissions to check for (AND logic)
   * @returns true if the principal has all permissions, false otherwise
   */
  public hasAllPermissions(
    principal: Authenticatable,
    permissions: string[],
  ): boolean {
    return permissions.every((p) => this.hasPermission(principal, p))
  }

  /**
   * Checks if a principal has any of the specified permissions.
   *
   * @param principal - The authenticated entity to check
   * @param permissions - The permissions to check for (OR logic)
   * @returns true if the principal has at least one permission, false otherwise
   */
  public hasAnyPermission(
    principal: Authenticatable,
    permissions: string[],
  ): boolean {
    return permissions.some((p) => this.hasPermission(principal, p))
  }

  /**
   * Requires a principal to have a specific permission, throws if not.
   *
   * @param principal - The authenticated entity to check
   * @param permission - The permission required
   * @throws {PermissionDeniedException} If the principal lacks the permission
   */
  public requirePermission(
    principal: Authenticatable,
    permission: string,
  ): void {
    if (!this.hasPermission(principal, permission)) {
      throw new PermissionDeniedException(permission)
    }
  }

  /**
   * Requires a principal to have all specified permissions, throws if not.
   *
   * @param principal - The authenticated entity to check
   * @param permissions - The permissions required (AND logic)
   * @throws {PermissionDeniedException} If the principal lacks any permission
   */
  public requireAllPermissions(
    principal: Authenticatable,
    permissions: string[],
  ): void {
    for (const permission of permissions) {
      if (!this.hasPermission(principal, permission)) {
        throw new PermissionDeniedException(permission)
      }
    }
  }

  /**
   * Requires a principal to have at least one of the specified permissions.
   *
   * @param principal - The authenticated entity to check
   * @param permissions - The permissions to check (OR logic)
   * @throws {PermissionDeniedException} If the principal has none of the permissions
   */
  public requireAnyPermission(
    principal: Authenticatable,
    permissions: string[],
  ): void {
    if (!this.hasAnyPermission(principal, permissions)) {
      throw new PermissionDeniedException(permissions.join(" | "))
    }
  }

  /**
   * Checks if a granted permission matches a required permission.
   * Supports wildcards:
   * - `*` matches any permission
   * - `*:resource` matches any action on that resource
   * - `action:*` matches that action on any resource
   *
   * @param granted - The permission the principal has
   * @param required - The permission being checked
   * @returns true if the granted permission satisfies the requirement
   */
  private matchesPermission(granted: string, required: string): boolean {
    // Exact match
    if (granted === required) {
      return true
    }

    // Superuser wildcard
    if (granted === "*") {
      return true
    }

    // Parse action:resource format
    const [grantedAction, grantedResource] = granted.split(":")
    const [requiredAction, requiredResource] = required.split(":")

    // If required doesn't have a resource part, only exact or * matches
    if (!requiredResource) {
      return false
    }

    // *:resource matches any action on that resource
    if (grantedAction === "*" && grantedResource === requiredResource) {
      return true
    }

    // action:* matches that action on any resource
    if (grantedAction === requiredAction && grantedResource === "*") {
      return true
    }

    return false
  }
}

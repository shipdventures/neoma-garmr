import { Injectable } from "@nestjs/common"

import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Service for checking and enforcing permissions on principals.
 *
 * Supports permission strings in the format `action:resource` with wildcard matching:
 * - `*` → matches all permissions (wildcard)
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
/**
 * Matches valid permission formats:
 * - `*` (matches all permissions)
 * - `name` (e.g. `admin` — single-segment, exact match only)
 * - `action:resource` (e.g. `read:users`)
 * - `*:resource` (e.g. `*:users`)
 * - `action:*` (e.g. `read:*`)
 */
const PERMISSION_FORMAT = /^(\*|[^:*]+|[^:*]+:[^:*]+|\*:[^:*]+|[^:*]+:\*)$/

@Injectable()
export class PermissionService {
  /**
   * Validates that a permission string matches an accepted format.
   * Throws on invalid formats — this is a programmer/data error.
   *
   * @param permission - The permission string to validate
   * @throws {Error} If the format is invalid
   */
  public static validateFormat(permission: string): void {
    if (!PERMISSION_FORMAT.test(permission)) {
      throw new Error(
        `Invalid permission format: "${permission}". ` +
          'Must be "*", "name", "action:resource", "*:resource", or "action:*".',
      )
    }
  }
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
      throw new PermissionDeniedException(
        [permission],
        "all",
        principal.id,
        principal.permissions,
      )
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
    const missing = permissions.filter((p) => !this.hasPermission(principal, p))
    if (missing.length > 0) {
      throw new PermissionDeniedException(
        missing,
        "all",
        principal.id,
        principal.permissions,
      )
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
      throw new PermissionDeniedException(
        permissions,
        "any",
        principal.id,
        principal.permissions,
      )
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
    PermissionService.validateFormat(granted)
    PermissionService.validateFormat(required)

    // Exact match
    if (granted === required) {
      return true
    }

    // Wildcard — matches all permissions
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

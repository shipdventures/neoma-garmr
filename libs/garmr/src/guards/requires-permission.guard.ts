import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { REQUIRED_ANY_PERMISSIONS_KEY } from "../decorators/requires-any-permission.decorator"
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/requires-permission.decorator"
import { Authenticatable } from "../interfaces/authenticatable.interface"
import { PermissionService } from "../services/permission.service"

/**
 * Guard that enforces permission-based authorization.
 *
 * This guard:
 * 1. Checks for an authenticated principal (throws 401 if missing)
 * 2. Checks required permissions based on metadata from decorators:
 *    - `@RequiresPermission()` - requires ALL permissions (AND logic)
 *    - `@RequiresAnyPermission()` - requires ANY permission (OR logic)
 *
 * @throws {UnauthorizedException} If no authenticated principal exists
 * @throws {PermissionDeniedException} If the principal lacks required permissions
 */
@Injectable()
export class RequiresPermissionGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Validates authentication and authorization for the current request.
   *
   * @param context - Execution context providing access to the request
   * @returns true if authorized
   * @throws {UnauthorizedException} If not authenticated
   * @throws {PermissionDeniedException} If permission check fails
   */
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()

    // Check authentication first
    if (!req.principal) {
      throw new UnauthorizedException(
        "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
      )
    }

    // Get required permissions from metadata (AND logic)
    const requiredAll = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Get required any permissions from metadata (OR logic)
    const requiredAny = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    const principal = req.principal as Authenticatable

    // Check AND permissions
    if (requiredAll?.length) {
      this.permissionService.requireAllPermissions(principal, requiredAll)
    }

    // Check OR permissions
    if (requiredAny?.length) {
      this.permissionService.requireAnyPermission(principal, requiredAny)
    }

    return true
  }
}

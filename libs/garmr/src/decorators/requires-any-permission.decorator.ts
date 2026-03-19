import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"

import { RequiresPermissionGuard } from "../guards/requires-permission.guard"

/**
 * Metadata key for storing required permissions (OR logic).
 */
export const REQUIRED_ANY_PERMISSIONS_KEY = "garmr:required_any_permissions"

/**
 * Decorator that requires the authenticated principal to have ANY of the specified permissions.
 *
 * This decorator automatically enforces authentication - there is no need to also use
 * the `@UseGuards(Authenticated)` guard.
 *
 * @param permissions - The permissions checked (OR logic - at least one must be present)
 *
 * @throws {UnauthorizedException} If no authenticated principal exists
 * @throws {PermissionDeniedException} If the principal has none of the specified permissions
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   @Delete(':id')
 *   @RequiresAnyPermission('admin', 'delete:users')
 *   public delete(@Param('id') id: string): Promise<void> { ... }
 * }
 * ```
 */
export function RequiresAnyPermission(
  ...permissions: string[]
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions),
    UseGuards(RequiresPermissionGuard),
  )
}

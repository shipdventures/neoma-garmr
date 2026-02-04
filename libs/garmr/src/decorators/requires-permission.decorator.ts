import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"

import { RequiresPermissionGuard } from "../guards/requires-permission.guard"

/**
 * Metadata key for storing required permissions (AND logic).
 */
export const REQUIRED_PERMISSIONS_KEY = "garmr:required_permissions"

/**
 * Decorator that requires the authenticated principal to have ALL specified permissions.
 *
 * This decorator automatically enforces authentication - there is no need to also use
 * the `@UseGuards(Authenticated)` guard.
 *
 * @param permissions - The permissions required (AND logic - all must be present)
 *
 * @throws {UnauthorizedException} If no authenticated principal exists
 * @throws {PermissionDeniedException} If the principal lacks any of the required permissions
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @RequiresPermission('read:users')
 *   public findAll(): Promise<User[]> { ... }
 *
 *   @Delete(':id')
 *   @RequiresPermission('read:users', 'delete:users')
 *   public delete(@Param('id') id: string): Promise<void> { ... }
 * }
 * ```
 */
export function RequiresPermission(
  ...permissions: string[]
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions),
    UseGuards(RequiresPermissionGuard),
  )
}

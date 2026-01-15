import { IntersectionType } from "@nestjs/mapped-types"

import { EmailDto } from "../dtos/email.dto"
import { PasswordDto } from "../dtos/password.dto"

/**
 * A DTO for validating login credentials.
 * Validates email format and password presence (no strength requirement).
 *
 * @property email - Must be a valid email address
 * @property password - Must be present (non-empty)
 *
 * @example Use for authentication:
 * ```typescript
 * @Post("login")
 * async login(@Body() dto: CredentialsDto): Promise<User> {
 *   return this.authenticationService.authenticate(dto, User)
 * }
 * ```
 */
export class CredentialsDto extends IntersectionType(EmailDto, PasswordDto) {}

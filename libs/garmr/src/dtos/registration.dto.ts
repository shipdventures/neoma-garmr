import { IntersectionType } from "@nestjs/mapped-types"
import { EmailDto } from "./email.dto"
import { NewPasswordDto } from "./new-password.dto"

/**
 * A DTO for serializing and validating a new account.
 *
 * @property email - Must be a valid email address
 * @property password - Must be at least 8 characters with 1 letter, 1 number, and 1 symbol
 *
 * @example Extend with additional fields:
 * ```typescript
 * class CreateUserDto extends RegistrationDto {
 *   @IsString()
 *   name: string
 * }
 * ```
 */
export class RegistrationDto extends IntersectionType(
  EmailDto,
  NewPasswordDto,
) {}

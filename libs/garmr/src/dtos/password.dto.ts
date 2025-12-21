import { IsNotEmpty, IsString } from "class-validator"

/**
 * A DTO for validating a password is present.
 * Does not enforce password strength — use {@link NewPasswordDto} for that.
 */
export class PasswordDto {
  /**
   * The password to validate.
   * - Must be present (non-empty string)
   */
  @IsString({ message: "Password must be a string." })
  @IsNotEmpty({ message: "Please enter your password." })
  public password!: string
}

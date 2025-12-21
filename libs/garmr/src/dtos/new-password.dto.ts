import { IsStrongPassword } from "class-validator"

/**
 * A DTO for serializing and validating a password.
 */
export class NewPasswordDto {
  /**
   * The password to validate.
   * - Must not be blank.
   * - Must have at least 8 characters.
   * - Must have at least one letter.
   * - Must have at least one number.
   * - Must have at least one symbol.
   */
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 0,
    },
    {
      message:
        "A strong password must be least 8 characters long and include at least 1 letter, 1 number, and 1 special character.",
    },
  )
  public password!: string
}

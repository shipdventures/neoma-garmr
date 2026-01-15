import { IsEmail, IsNotEmpty } from "class-validator"

/**
 * A DTO for serializing and validating an email address.
 */
export class EmailDto {
  /**
   * The email address to validate.
   * - Must be a valid email address.
   */
  @IsEmail({}, { message: "Please enter a valid email address." })
  @IsNotEmpty({ message: "Please enter your email address." })
  public email!: string
}

import { Body, Controller, Post } from "@nestjs/common"
import { v4 } from "uuid"

/**
 * Controller responsible for handling credential-related operations.
 */
@Controller("/credentials")
export class CredentialsController {
  /**
   * Creates new credentials.
   *
   * @param credentials - The credentials data containing the email.
   *
   * @returns An object containing the generated ID and the normalized email.
   */
  @Post()
  public create(@Body() credentials: { email: string }): {
    id: string
    email: string
  } {
    return {
      id: v4(),
      email: credentials.email.toLowerCase(),
    }
  }
}

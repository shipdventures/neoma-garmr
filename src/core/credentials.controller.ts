import {
  RegistrationDto,
  RegistrationService,
  TokenService,
} from "@neoma/garmr"
import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"

import { User } from "specs/shared/user.entity"

/**
 * A test Controller for user registration and token issuance
 * using Garmr's RegistrationService and TokenService to prove
 * the build and import of the package.
 */
@Controller("credentials")
@UsePipes(new ValidationPipe({ stopAtFirstError: true }))
export class CredentialsController {
  /**
   * Creates an instance of CredentialsController.
   *
   * @param registrationService - The registration service for creating users
   * @param tokenService - The token service for issuing JWTs
   */
  public constructor(
    private readonly registrationService: RegistrationService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Registers a new user and issues a JWT token. Use this endpoint
   * to create {@link Authenticatables} for testing authentication flows.
   *
   * @param dto - The registration data transfer object
   * @returns An object containing the new user's id, email, and JWT token
   */
  @Post()
  public async create(
    @Body() dto: RegistrationDto,
  ): Promise<{ id: string; email: string; token: string }> {
    const user = await this.registrationService.register<User>(dto)
    const { token } = this.tokenService.issue(user)
    return {
      id: user.id,
      email: user.email,
      token,
    }
  }
}

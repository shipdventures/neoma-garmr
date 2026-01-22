import {
  AuthenticationService,
  CredentialsDto,
  TokenService,
} from "@neoma/garmr"
import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"

/**
 * A test Controller for user authentication and token issuance
 * using Garmr's AuthenticationService and TokenService to prove
 * the build and import of the package.
 */
@Controller("sessions")
@UsePipes(new ValidationPipe({ stopAtFirstError: true }))
export class SessionsController {
  /**
   * Creates an instance of SessionsController.
   *
   * @param authenticationService - The authentication service for validating credentials
   * @param tokenService - The token service for issuing JWTs
   */
  public constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticates a user and issues a JWT token. Use this endpoint
   * to create sessions for testing protected routes.
   *
   * @param dto - The credentials data transfer object
   * @returns An object containing a JWT token
   */
  @Post()
  public async create(@Body() dto: CredentialsDto): Promise<{ token: string }> {
    const user = await this.authenticationService.authenticate(dto)
    const { token } = this.tokenService.issue(user)
    return { token }
  }
}

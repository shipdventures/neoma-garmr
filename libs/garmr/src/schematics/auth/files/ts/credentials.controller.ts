import {
  Authenticatable,
  RegistrationDto,
  RegistrationService,
  TokenService,
} from "@neoma/garmr"
import {
  Body,
  Controller,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { Response } from "express"

@Controller("credentials")
@UsePipes(new ValidationPipe({ stopAtFirstError: true }))
export class CredentialsController<T extends Authenticatable> {
  public constructor(
    private readonly registrationService: RegistrationService,
    private readonly tokenService: TokenService,
  ) {}

  @Post()
  public async create(
    @Body() dto: RegistrationDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<T> {
    const user = await this.registrationService.register<T>(dto)
    const { token, payload } = this.tokenService.issue(user)

    response.cookie("garmr.sid", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      expires: new Date(payload.exp * 1000),
    })

    return user
  }
}

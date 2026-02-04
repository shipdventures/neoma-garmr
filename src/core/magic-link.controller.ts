import {
  EmailDto,
  MagicLinkService,
  SESSION_AUDIENCE,
  TokenService,
} from "@neoma/garmr"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"

import { User } from "../user.entity"

interface VerifyResponse {
  token: string
  user: User
  isNewUser: boolean
}

@Controller("magic-link")
@UsePipes(new ValidationPipe({ stopAtFirstError: true }))
export class MagicLinkController {
  public constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly tokenService: TokenService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public async create(@Body() { email }: EmailDto): Promise<void> {
    await this.magicLinkService.send(email)
  }

  @Get("verify")
  public async verify(@Query("token") token: string): Promise<VerifyResponse> {
    const { entity, isNewUser } =
      await this.magicLinkService.verify<User>(token)

    const { token: sessionToken } = this.tokenService.issue({
      sub: entity.id,
      aud: SESSION_AUDIENCE,
    })

    return {
      token: sessionToken,
      user: entity,
      isNewUser,
    }
  }
}

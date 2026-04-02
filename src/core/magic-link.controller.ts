import { EmailDto, MagicLinkService, SessionService } from "@lib"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { Response } from "express"

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
    private readonly sessionService: SessionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public async create(@Body() { email }: EmailDto): Promise<void> {
    await this.magicLinkService.send(email)
  }

  @Get("verify")
  public async verify(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyResponse> {
    const { entity, isNewUser } =
      await this.magicLinkService.verify<User>(token)

    const { token: sessionToken } = this.sessionService.create(res, entity)

    return {
      token: sessionToken,
      user: entity,
      isNewUser,
    }
  }
}

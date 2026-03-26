import { SessionService } from "@neoma/garmr"
import { Controller, HttpCode, HttpStatus, Post, Res } from "@nestjs/common"
import { Response } from "express"

@Controller("logout")
export class LogoutController {
  public constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  public logout(@Res({ passthrough: true }) res: Response): void {
    this.sessionService.clear(res)
  }
}

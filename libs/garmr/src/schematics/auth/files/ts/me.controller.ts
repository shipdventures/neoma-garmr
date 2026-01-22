import { Authenticated, Authenticatable, Principal } from "@neoma/garmr"
import { Controller, Get, UseGuards } from "@nestjs/common"

@Controller("me")
@UseGuards(Authenticated)
export class MeController<T extends Authenticatable> {
  @Get()
  public get(@Principal() user: T): T {
    return user
  }
}

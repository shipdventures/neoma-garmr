import { Authenticated, Principal } from "@neoma/garmr"
import { Controller, Get, UseGuards } from "@nestjs/common"
import { User } from "specs/shared/user.entity"

/**
 * A test Controller for accessing the authenticated user
 * using Garmr's Authenticated guard and Principal decorator.
 */
@Controller("me")
@UseGuards(Authenticated)
export class MeController {
  /**
   * Returns the authenticated user's id and email.
   *
   * @param user - The authenticated user from the Principal decorator
   * @returns An object containing the user's id and email
   */
  @Get()
  public get(@Principal() user: User): { id: string; email: string } {
    return {
      id: user.id,
      email: user.email,
    }
  }
}

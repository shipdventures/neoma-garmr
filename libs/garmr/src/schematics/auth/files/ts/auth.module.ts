import { Module } from "@nestjs/common"

import { CredentialsController } from "./credentials.controller"
import { MeController } from "./me.controller"
import { SessionsController } from "./sessions.controller"

@Module({
  controllers: [CredentialsController, MeController, SessionsController],
})
export class AuthModule {}

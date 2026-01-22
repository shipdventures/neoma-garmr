import { GarmrModule } from "@neoma/garmr"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { User } from "specs/shared/user.entity"

import { CredentialsController } from "./credentials.controller"
import { MeController } from "./me.controller"
import { SessionsController } from "./sessions.controller"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [User],
      synchronize: true,
    }),
    GarmrModule.forRoot({
      secret: process.env.GARMR_SECRET!,
      expiresIn: "1h",
      entity: User,
    }),
  ],
  controllers: [CredentialsController, MeController, SessionsController],
})
export class AppModule {}

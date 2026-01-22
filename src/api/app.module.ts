import { GarmrModule } from "@neoma/garmr"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { User } from "specs/shared/user.entity"

import { AuthModule } from "./auth/auth.module"

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
      expiresIn: "1d",
      entity: User,
    }),
    AuthModule,
  ],
})
export class AppModule {}

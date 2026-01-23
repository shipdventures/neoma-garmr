import { GarmrModule } from "@neoma/garmr"
import { ClassSerializerInterceptor, Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"
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
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}

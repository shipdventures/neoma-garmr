import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { GarmrModule, Controllers } from "@neoma/garmr"
import { AppController } from "./app.controller"
import { User } from "./user.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [User],
      synchronize: true,
    }),
    GarmrModule.forRoot({
      secret: "test-secret",
      expiresIn: "1h",
      entity: User,
    }),
  ],
  controllers: [AppController, ...Controllers],
})
export class AppModule {}

import { faker } from "@faker-js/faker/."
import { GarmrModule } from "@neoma/garmr"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

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
      secret: faker.internet.password(),
      expiresIn: "1h",
      entity: User,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

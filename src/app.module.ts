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
      secret: process.env.GARMR_SECRET!,
      expiresIn: "1h",
      entity: User,
      mailer: {
        host: process.env.MAILPIT_HOST!,
        port: parseInt(process.env.MAILPIT_PORT!),
        from: process.env.MAGIC_LINK_FROM!,
        subject: process.env.MAGIC_LINK_SUBJECT!,
        html: `<a href="${process.env.APP_URL!}/magic-link/verify?token={{token}}">Sign in</a>`,
        auth: {
          user: process.env.MAILPIT_AUTH_USER!,
          pass: process.env.MAILPIT_AUTH_PASS!,
        },
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

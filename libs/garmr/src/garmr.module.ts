import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { CredentialsController } from "./controllers/credentials.controller"
import { GarmrOptions, GARMR_OPTIONS } from "./garmr.options"
import { Authenticatable } from "./interfaces/authenticatable.interface"
import { AuthenticationMiddleware } from "./middlewares/authentication.middleware"
import { AuthenticationService } from "./services/authentication.service"
import { PasswordService } from "./services/password.service"
import { RegistrationService } from "./services/registration.service"
import { TokenService } from "./services/token.service"

/**
 * Authentication module for NestJS applications.
 *
 * @requires TypeOrmModule must be configured in your application.
 *
 * @example
 * ```typescript
 * import { GarmrModule } from '@neoma/garmr'
 *
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     GarmrModule.forRoot({
 *       secret: process.env.JWT_SECRET,
 *       expiresIn: '1h',
 *       entity: User,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class GarmrModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthenticationMiddleware).forRoutes("*")
  }

  public static forRoot<T extends Authenticatable>(
    options: GarmrOptions<T>,
  ): DynamicModule {
    return {
      module: GarmrModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        {
          provide: GARMR_OPTIONS,
          useValue: options,
        },
        AuthenticationService,
        PasswordService,
        RegistrationService,
        TokenService,
      ],
      exports: [AuthenticationService, RegistrationService, TokenService],
      controllers: [CredentialsController],
    }
  }
}

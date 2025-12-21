import { DynamicModule, Module } from "@nestjs/common"
import { RegistrationService } from "./services/registration.service"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { AuthenticationService } from "./services/authentication.service"
import { PasswordService } from "./services/password.service"
import { TokenService } from "./services/token.service"
import { GarmrOptions, GARMR_OPTIONS } from "./garmr.options"
import { Authenticatable } from "./interfaces/authenticatable.interface"

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
export class GarmrModule {
  /**
   * Configures the Garmr authentication module.
   *
   * @param options - Configuration options for authentication
   * @param options.secret - Secret key used to sign and verify JWTs
   * @param options.expiresIn - Token expiration time (e.g., "1h", "7d", or seconds as number)
   * @param options.entity - The entity class implementing {@link Authenticatable} used for registration and authentication
   * @returns A configured dynamic module
   */
  public static forRoot<T extends Authenticatable>(
    options: GarmrOptions<T>,
  ): DynamicModule {
    return {
      module: GarmrModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        AuthenticationService,
        PasswordService,
        RegistrationService,
        TokenService,
        {
          provide: GARMR_OPTIONS,
          useValue: options,
        },
      ],
      exports: [AuthenticationService, RegistrationService, TokenService],
    }
  }
}

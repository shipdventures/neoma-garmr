import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"

import { ConfigurableModuleClass } from "./garmr.module-definition"
import { BearerAuthenticationMiddleware } from "./middlewares/bearer-authentication.middleware"
import { CookieAuthenticationMiddleware } from "./middlewares/cookie-authentication.middleware"

/**
 * Passwordless authentication module for NestJS applications.
 *
 * @requires TypeOrmModule must be configured in your application.
 *
 * @example Static configuration
 * ```typescript
 * GarmrModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '1h',
 *   entity: User,
 *   mailer: { ... },
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * GarmrModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     secret: config.get('JWT_SECRET'),
 *     expiresIn: '1h',
 *     entity: User,
 *     mailer: { ... },
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class GarmrModule extends ConfigurableModuleClass implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(BearerAuthenticationMiddleware, CookieAuthenticationMiddleware)
      .forRoutes("*")
  }
}

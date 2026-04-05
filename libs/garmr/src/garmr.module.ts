import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"

import { ConfigurableModuleClass } from "./garmr.module-definition"
import { BearerAuthenticationMiddleware } from "./middlewares/bearer-authentication.middleware"
import { CookieAuthenticationMiddleware } from "./middlewares/cookie-authentication.middleware"

/**
 * Passwordless authentication module for NestJS applications.
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
 *       mailer: { ... },
 *     }),
 *   ],
 * })
 * export class AppModule {}
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

import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common"

import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"

/**
 * Guard that only allows access to a [Controller](https://docs.nestjs.com/controllers)
 * if there is an authenticated principal.
 *
 * It is recommended to use this in conjunction with the {@link BearerAuthenticationMiddleware}
 * and {@link CookieAuthenticationMiddleware} which set req.principal when there is an
 * authenticated session.
 *
 * @example API usage (returns 401 JSON)
 * ```typescript
 * @UseGuards(Authenticated)
 * @Get("me")
 * public me() {}
 * ```
 *
 * @example Server-rendered usage (redirects to login page)
 * ```typescript
 * @UseGuards(new Authenticated("/auth/magic-link"))
 * @Get("dashboard")
 * public dashboard() {}
 * ```
 */
@Injectable()
export class Authenticated implements CanActivate {
  /**
   * @param redirectUrl - Optional URL to redirect unauthenticated users to.
   *   When provided, throws {@link UnauthorizedRedirectException} instead of a plain
   *   {@link UnauthorizedException}. The exception is still a 401 but carries redirect
   *   metadata via `getRedirect()` that an exception filter may use to issue an HTTP
   *   redirect for browser-based requests.
   */
  public constructor(@Optional() private readonly redirectUrl?: string) {}

  /**
   * If req.principal is truthy will return true so that request handling can be
   * passed onto the relevant [Controller](https://docs.nestjs.com/controllers)
   * method, otherwise throws an UnauthorizedException.
   *
   * @param { ExecutionContext } context - Context providing access to the underlying request.
   *
   * @returns { true } - If req.principal is set.
   *
   * @throws { UnauthorizedException } - If req.principal is not set.
   * @throws { UnauthorizedRedirectException } - If req.principal is not set and a redirect URL was provided.
   */
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()

    if (!req.principal) {
      if (this.redirectUrl) {
        throw new UnauthorizedRedirectException(
          this.redirectUrl,
          HttpStatus.SEE_OTHER,
        )
      }

      throw new UnauthorizedException(
        "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
      )
    }

    return true
  }
}

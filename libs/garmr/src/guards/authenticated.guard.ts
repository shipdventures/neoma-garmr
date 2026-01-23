import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"

/**
 * Guard that only allows access to a [Controller](https://docs.nestjs.com/controllers)
 * if there is an authenticated principal.
 *
 * It is recommended to use this in conjunction with an authentication middleware
 * (e.g. {@link BearerAuthenticationMiddleware}) which sets req.principal when
 * there is an authenticated session.
 */
@Injectable()
export class Authenticated implements CanActivate {
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
   */
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()

    if (!req.principal) {
      throw new UnauthorizedException(
        "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
      )
    }

    return true
  }
}

import { Injectable, NestMiddleware } from "@nestjs/common"
import { Request, NextFunction } from "express"

import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using the
 * Authorization header. If authentication is successful, the
 * authenticated principal is assigned to req.principal.
 *
 * If authentication fails (for any reason), no principal is assigned
 * and the request proceeds unauthenticated.
 *
 * This middleware does not throw any errors; it simply logs a warning
 * if authentication fails.
 *
 * @note This middleware optionally relies on the presence of a logger on
 * the request object to log warnings. If no logger is present, no logging
 * will occur.
 */
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  /**
   * Creates an instance of AuthenticationMiddleware.
   * @param service The authentication service used to authenticate requests.
   */
  public constructor(private readonly service: AuthenticationService) {}

  /**
   * Middleware function that attempts to authenticate the request.
   *
   * Authentication is performed using the `Authorization` header.
   * If authentication is successful, the authenticated principal
   * is assigned to `req.principal`. If authentication fails,
   * no principal is assigned and a warning is logged.
   *
   * @param req The Express request object to which the principal may be assigned.
   * @param _res The Express response object (not used).
   * @param next The next middleware function in the chain.
   */
  public async use(
    req: Request,
    _res: Express.Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      req.principal = await this.service.authenticate(
        req.headers.authorization!,
      )
    } catch (err) {
      req.logger?.warn?.("Authentication via authorization header failed", {
        err,
      })
    }
    next()
  }
}

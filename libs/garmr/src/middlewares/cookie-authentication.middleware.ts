import { Injectable, NestMiddleware } from "@nestjs/common"
import * as cookie from "cookie"
import { Request, NextFunction } from "express"

import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using the
 * garmr.sid cookie. If authentication is successful, the authenticated
 * principal is assigned to req.principal.
 *
 * If req.principal is already set (by a previous middleware), this
 * middleware skips authentication and calls next.
 *
 * If no cookie header is present or there is no garmr.sid cookie,
 * the request proceeds unauthenticated without error.
 *
 * If the cookie is present but authentication fails (invalid JWT,
 * expired token, user not found), no principal is assigned and the
 * request proceeds unauthenticated with a warning logged.
 *
 * @note This middleware optionally relies on the presence of a logger (req.logger)
 * on the request object to log warnings. If no logger is present, no logging
 * will occur.
 */
@Injectable()
export class CookieAuthenticationMiddleware implements NestMiddleware {
  /**
   * Creates an instance of CookieAuthenticationMiddleware.
   * @param service The authentication service used to authenticate requests.
   */
  public constructor(private readonly service: AuthenticationService) {}

  /**
   * Middleware function that attempts to authenticate the request.
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
    if (req.principal) {
      return next()
    }

    const cookieHeader = req.headers.cookie
    if (!cookieHeader) {
      return next()
    }

    const cookies = cookie.parse(cookieHeader)
    const sid = cookies["garmr.sid"]
    if (!sid) {
      return next()
    }

    try {
      req.principal = await this.service.authenticate(sid)
    } catch (err) {
      req.logger?.warn?.("Authentication via cookie failed", {
        err,
      })
    }
    next()
  }
}

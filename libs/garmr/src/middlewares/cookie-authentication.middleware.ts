import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import * as cookie from "cookie"
import { Request, NextFunction } from "express"

import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"
import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using the
 * garmr.sid cookie (or a custom cookie name from options).
 *
 * If req.principal is already set (by a previous middleware), this
 * middleware skips authentication and calls next.
 *
 * If no cookie header is present or there is no matching cookie,
 * the request proceeds unauthenticated without error.
 *
 * If the cookie is present but authentication fails, no principal
 * is assigned and the request proceeds unauthenticated with a
 * warning logged.
 */
@Injectable()
export class CookieAuthenticationMiddleware implements NestMiddleware {
  private readonly cookieName: string

  public constructor(
    private readonly service: AuthenticationService,
    @Inject(GARMR_OPTIONS) options: GarmrOptions,
  ) {
    this.cookieName = options.cookie?.name ?? "garmr.sid"
  }

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
    const sid = cookies[this.cookieName]
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

import { Inject, Injectable } from "@nestjs/common"
import * as cookie from "cookie"
import { Response } from "express"
import * as jwt from "jsonwebtoken"

import { CookieOptions, GarmrOptions, GARMR_OPTIONS } from "../garmr.options"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { TokenService } from "./token.service"

@Injectable()
export class SessionService {
  private readonly cookieOptions: Required<
    Pick<CookieOptions, "name" | "path" | "secure" | "sameSite">
  > &
    Pick<CookieOptions, "domain">

  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly tokenService: TokenService,
  ) {
    const opts = this.options.cookie ?? {}
    this.cookieOptions = {
      name: opts.name ?? "garmr.sid",
      path: opts.path ?? "/",
      secure: opts.secure ?? true,
      sameSite: opts.sameSite ?? "lax",
      domain: opts.domain,
    }
  }

  /**
   * Creates a session for the given entity.
   *
   * Issues a session JWT and sets it as an httpOnly cookie on the response.
   *
   * @param res - Express response object
   * @param entity - The authenticated entity
   * @returns The issued token and decoded payload
   */
  public create(
    res: Response,
    entity: Authenticatable,
  ): { token: string; payload: jwt.JwtPayload } {
    const result = this.tokenService.issue({
      sub: entity.id,
      aud: SESSION_AUDIENCE,
    })

    const maxAge =
      result.payload.exp && result.payload.iat
        ? result.payload.exp - result.payload.iat
        : undefined

    const serialized = cookie.serialize(this.cookieOptions.name, result.token, {
      httpOnly: true,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
      domain: this.cookieOptions.domain,
      maxAge,
    })

    this.appendCookie(res, serialized)

    return result
  }

  /**
   * Clears the session cookie.
   *
   * @param res - Express response object
   */
  public clear(res: Response): void {
    const serialized = cookie.serialize(this.cookieOptions.name, "", {
      httpOnly: true,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
      domain: this.cookieOptions.domain,
      maxAge: 0,
    })

    this.appendCookie(res, serialized)
  }

  private appendCookie(res: Response, serialized: string): void {
    const existing = res.getHeader("Set-Cookie")
    if (!existing) {
      res.setHeader("Set-Cookie", serialized)
    } else if (Array.isArray(existing)) {
      res.setHeader("Set-Cookie", [...existing, serialized])
    } else {
      res.setHeader("Set-Cookie", [String(existing), serialized])
    }
  }
}

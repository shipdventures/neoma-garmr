import { Injectable, NestMiddleware } from "@nestjs/common"
import { Request, NextFunction } from "express"

import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using the
 * Authorization header. If authentication is successful, the
 * authenticated principal is assigned to req.principal.
 *
 * If no Authorization header is present, the request proceeds
 * unauthenticated without error.
 *
 * If an Authorization header is present but malformed (wrong scheme,
 * missing token), an InvalidCredentialsException is thrown to provide
 * clear feedback to the caller.
 *
 * If the header is well-formed but authentication fails (invalid JWT,
 * expired token, user not found), no principal is assigned and the
 * request proceeds unauthenticated with a warning logged.
 *
 * @note This middleware optionally relies on the presence of a logger (req.logger)
 * on the request object to log warnings. If no logger is present, no logging
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
   * @param req The Express request object to which the principal may be assigned.
   * @param _res The Express response object (not used).
   * @param next The next middleware function in the chain.
   *
   * @throws {@link InvalidCredentialsException} if the Authorization header is present but malformed.
   */
  public async use(
    req: Request,
    _res: Express.Response,
    next: NextFunction,
  ): Promise<void> {
    const header = req.headers.authorization
    if (!header) {
      return next()
    }

    const [scheme, token] = header.split(/\s+/)

    if (scheme.toLowerCase() !== "bearer") {
      throw new InvalidCredentialsException(
        `Invalid authentication scheme. Expected Bearer but got "${scheme}"`,
      )
    }

    if (!token) {
      throw new InvalidCredentialsException(
        "Invalid authentication header format",
      )
    }

    try {
      req.principal = await this.service.authenticate(token)
    } catch (err) {
      req.logger?.warn?.("Authentication via authorization header failed", {
        err,
      })
    }
    next()
  }
}

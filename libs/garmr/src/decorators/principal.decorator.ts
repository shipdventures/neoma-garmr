import { createParamDecorator, ExecutionContext } from "@nestjs/common"

import { Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Parameter Decorator that extracts the current principal from the Request Object.
 */
export const Principal = createParamDecorator(
  /**
   * Returns the principal object at req.principal.
   *
   * @param _data - ignored.
   * @param context - Context that provides access to the underlying
   * Request to allow access to req.principal.
   *
   * @throws Error if req.principal does not exist. This is likely a programmer error
   * as the middleware should have been installed to provide the principal object and
   * an {@link Authenticated} guard should have been used to protect against
   * this scenario.
   *
   * @returns The principal from req.principal if it exists.
   *
   */
  (_data: any, context: ExecutionContext): Authenticatable => {
    const req = context.switchToHttp().getRequest()
    if (!req.principal) {
      throw new Error(
        "PrincipalDecorator called without a principal, have you installed an authentication middleware?",
      )
    }
    return req.principal
  },
)

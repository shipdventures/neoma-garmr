import { UnauthorizedException } from "@nestjs/common"

/**
 * Thrown when an unauthenticated request should be redirected to a login page
 * rather than receiving a 401 JSON response.
 *
 * Extends {@link UnauthorizedException} so existing 401 catch filters still apply.
 * The `getRedirect()` method provides the redirect URL and status code
 * for an exception filter to choose to handle as an HTTP redirect.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedRedirectException("/auth/magic-link", HttpStatus.SEE_OTHER)
 * ```
 */
export class UnauthorizedRedirectException extends UnauthorizedException {
  /**
   * @param url - The URL to redirect the unauthenticated user to
   * @param redirectStatus - The HTTP status code for the redirect (e.g. 303 See Other)
   */
  public constructor(
    public readonly url: string,
    public readonly redirectStatus: number,
  ) {
    super("Unauthorized. Redirecting to login.")
  }

  /**
   * Returns the redirect target for an exception filter to handle.
   *
   * @returns Object containing the redirect URL and HTTP status code
   */
  public getRedirect(): { url: string; status: number } {
    return { url: this.url, status: this.redirectStatus }
  }
}

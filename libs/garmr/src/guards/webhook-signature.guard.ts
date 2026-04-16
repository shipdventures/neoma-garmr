import { createHmac, timingSafeEqual } from "crypto"

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common"

import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"

/**
 * Guard that verifies Svix-standard webhook signatures.
 *
 * Validates the HMAC-SHA256 signature in the `svix-signature` header against
 * the request's raw body using the secret configured in `GarmrOptions.webhook`.
 *
 * Requires `rawBody: true` on the NestJS application factory so that
 * `req.rawBody` is available.
 *
 * @example
 * ```typescript
 * @Post("webhooks/inbound-email")
 * @UseGuards(WebhookSignatureGuard)
 * async handleInboundEmail(@Body() payload: InboundEmailPayload) {
 *   // Guard already verified the signature
 * }
 * ```
 *
 * @throws {Error} If `webhook.secret` is not configured in GarmrModule options
 * (boot-time configuration error).
 * @throws {InternalServerErrorException} If rawBody is unavailable (server
 * misconfiguration).
 * @throws {UnauthorizedException} If headers are missing or signature is invalid.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
  ) {
    if (!this.options.webhook?.secret) {
      throw new Error(
        "WebhookSignatureGuard requires webhook.secret to be configured in GarmrModule options.",
      )
    }
  }

  /**
   * Validates the Svix-standard HMAC-SHA256 signature on the incoming request.
   *
   * @param context - Execution context providing access to the request
   * @returns true if the signature is valid
   * @throws {InternalServerErrorException} If rawBody is not available
   * (server misconfiguration)
   * @throws {UnauthorizedException} If required headers are missing or the
   * signature is invalid
   */
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const webhookSecret = this.options.webhook!.secret

    // 1. Verify rawBody is available
    if (!req.rawBody) {
      throw new InternalServerErrorException("Internal server error")
    }

    // 2. Extract required headers
    const svixId = req.headers["svix-id"] as string | undefined
    const svixTimestamp = req.headers["svix-timestamp"] as string | undefined
    const svixSignature = req.headers["svix-signature"] as string | undefined

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException(
        "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
      )
    }

    // 3. Derive signing key: strip "whsec_" prefix, base64-decode
    const keyBase64 = webhookSecret.startsWith("whsec_")
      ? webhookSecret.slice(6)
      : webhookSecret
    const key = Buffer.from(keyBase64, "base64")

    // 4. Build signed content and compute expected signature
    const signedContent = `${svixId}.${svixTimestamp}.${req.rawBody}`
    const expectedSignature = createHmac("sha256", key)
      .update(signedContent)
      .digest()

    // 5. Check each signature in the header (space-separated, v1-prefixed)
    const signatures = svixSignature.split(" ")
    for (const sig of signatures) {
      const parts = sig.split(",")
      if (parts.length !== 2 || parts[0] !== "v1") {
        continue
      }

      const candidateSignature = Buffer.from(parts[1], "base64")

      if (
        candidateSignature.length === expectedSignature.length &&
        timingSafeEqual(candidateSignature, expectedSignature)
      ) {
        return true
      }
    }

    throw new UnauthorizedException("Invalid webhook signature")
  }
}

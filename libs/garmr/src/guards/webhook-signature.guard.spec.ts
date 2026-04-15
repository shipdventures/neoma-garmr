import { createHmac } from "crypto"

import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { express, MockRequest } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"

import { GarmrOptions, GARMR_OPTIONS } from "../garmr.options"

import { WebhookSignatureGuard } from "./webhook-signature.guard"

/**
 * Computes a valid Svix-standard HMAC-SHA256 signature for the given
 * parameters, returning the full `v1,<base64>` string.
 */
const computeSignature = (
  secret: string,
  svixId: string,
  svixTimestamp: string,
  body: string,
): string => {
  const keyBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret
  const key = Buffer.from(keyBase64, "base64")
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const signature = createHmac("sha256", key)
    .update(signedContent)
    .digest("base64")
  return `v1,${signature}`
}

const TEST_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
const SVIX_ID = "msg_2Lx0r7Gmz1lL7dK3n4y5j"
const SVIX_TIMESTAMP = "1713200000"
const BODY = JSON.stringify({ type: "user.created", data: { id: "usr_123" } })

describe("WebhookSignatureGuard", () => {
  let guard: WebhookSignatureGuard

  const buildGuard = async (
    options: Partial<GarmrOptions> = {},
  ): Promise<WebhookSignatureGuard> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        {
          provide: GARMR_OPTIONS,
          useValue: {
            secret: "jwt-secret",
            expiresIn: "1h",
            entity: class User {},
            mailer: {} as any,
            ...options,
          },
        },
      ],
    }).compile()

    return module.get(WebhookSignatureGuard)
  }

  const buildRequest = (overrides: Partial<MockRequest> = {}): MockRequest => {
    const signature = computeSignature(
      TEST_SECRET,
      SVIX_ID,
      SVIX_TIMESTAMP,
      BODY,
    )
    const request = express.request({
      method: "POST",
      body: JSON.parse(BODY),
      headers: {
        "svix-id": SVIX_ID,
        "svix-timestamp": SVIX_TIMESTAMP,
        "svix-signature": signature,
        "content-type": "application/json",
        ...overrides.headers,
      },
      ...overrides,
    })
    request.rawBody = Buffer.from(BODY)
    return request
  }

  beforeEach(async () => {
    guard = await buildGuard({ webhook: { secret: TEST_SECRET } })
  })

  describe("When the request has a valid signature", () => {
    it("should return true", () => {
      const request = buildRequest()
      const ctx = executionContext(request, express.response())

      expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
    })
  })

  describe("When the signature header contains multiple signatures with one valid", () => {
    it("should return true", () => {
      const validSig = computeSignature(
        TEST_SECRET,
        SVIX_ID,
        SVIX_TIMESTAMP,
        BODY,
      )
      const invalidSig = "v1,aW52YWxpZHNpZ25hdHVyZQ=="
      const request = buildRequest({
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": `${invalidSig} ${validSig}`,
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
    })
  })

  describe("When the signature is invalid (wrong secret)", () => {
    it("should throw UnauthorizedException", () => {
      const wrongSecret = "whsec_dGhpc2lzYXdyb25nc2VjcmV0"
      const wrongSig = computeSignature(
        wrongSecret,
        SVIX_ID,
        SVIX_TIMESTAMP,
        BODY,
      )
      const request = buildRequest({
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": wrongSig,
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature." },
      )
    })
  })

  describe("When the body has been tampered with", () => {
    it("should throw UnauthorizedException", () => {
      const request = buildRequest()
      request.rawBody = Buffer.from(JSON.stringify({ tampered: true }))

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature." },
      )
    })
  })

  describe("When the svix-id header is missing", () => {
    it("should throw UnauthorizedException", () => {
      const request = buildRequest({
        headers: {
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": "v1,abc",
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature.",
        },
      )
    })
  })

  describe("When the svix-timestamp header is missing", () => {
    it("should throw UnauthorizedException", () => {
      const request = buildRequest({
        headers: {
          "svix-id": SVIX_ID,
          "svix-signature": "v1,abc",
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature.",
        },
      )
    })
  })

  describe("When the svix-signature header is missing", () => {
    it("should throw UnauthorizedException", () => {
      const request = buildRequest({
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature.",
        },
      )
    })
  })

  describe("When the signature header has no v1 prefix", () => {
    it("should throw UnauthorizedException", () => {
      const request = buildRequest({
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": "noprefixsignature",
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature." },
      )
    })
  })

  describe("When rawBody is not available on the request", () => {
    it("should throw UnauthorizedException with a descriptive message", () => {
      const request = buildRequest()
      delete request.rawBody

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "WebhookSignatureGuard requires rawBody: true on the NestJS application factory.",
        },
      )
    })
  })

  describe("When webhook config is not provided", () => {
    it("should throw UnauthorizedException with a descriptive message", async () => {
      const guardNoConfig = await buildGuard({ webhook: undefined })
      const request = buildRequest()

      const ctx = executionContext(request, express.response())
      expect(() =>
        guardNoConfig.canActivate(<ExecutionContext>ctx),
      ).toThrowMatching(UnauthorizedException, {
        message:
          "WebhookSignatureGuard requires webhook.secret to be configured in GarmrModule options.",
      })
    })
  })
})

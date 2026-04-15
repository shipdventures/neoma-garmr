import { createHmac } from "crypto"

import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, UNAUTHORIZED } = HttpStatus

const TEST_SECRET = process.env.WEBHOOK_SECRET!
const SVIX_ID = "msg_2Lx0r7Gmz1lL7dK3n4y5j"
const SVIX_TIMESTAMP = "1713200000"
const BODY = { type: "user.created", data: { id: "usr_123" } }

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

const appModules: [string, string][] = [
  ["forRoot", "src/core/app.module.ts#AppModule"],
  ["forRootAsync", "src/core/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`POST /webhooks (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        module: modulePath,
        nestApplicationOptions: { rawBody: true },
      })
    })

    describe("When a request is made with a valid signature", () => {
      it("should respond with HTTP 200", async () => {
        const bodyString = JSON.stringify(BODY)
        const signature = computeSignature(
          TEST_SECRET,
          SVIX_ID,
          SVIX_TIMESTAMP,
          bodyString,
        )

        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", signature)
          .send(BODY)
          .expect(OK)
          .expect({ received: true })
      })
    })

    describe("When a request is made with an invalid signature", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", "v1,aW52YWxpZHNpZ25hdHVyZQ==")
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message: "Invalid webhook signature.",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made without svix headers", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message:
              "Missing required webhook headers: svix-id, svix-timestamp, svix-signature.",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made with a tampered body", () => {
      it("should respond with HTTP 401", async () => {
        const originalBody = JSON.stringify(BODY)
        const signature = computeSignature(
          TEST_SECRET,
          SVIX_ID,
          SVIX_TIMESTAMP,
          originalBody,
        )

        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", signature)
          .send({ tampered: true })
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message: "Invalid webhook signature.",
            error: "Unauthorized",
          })
      })
    })
  })
})

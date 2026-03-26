import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { mailpit } from "fixtures/email/mailpit"
import {
  authenticateViaEmail,
  extractCookieValue,
} from "fixtures/fakes/magic-link"
import * as request from "supertest"

const { NO_CONTENT } = HttpStatus

describe("POST /logout", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  afterEach(() => mailpit.clear())

  describe("When a request is made with a valid session cookie", () => {
    it(`should respond with HTTP ${NO_CONTENT}`, async () => {
      const { cookie } = await authenticateViaEmail(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/logout")
        .set("Cookie", extractCookieValue(cookie))
        .expect(NO_CONTENT)
    })

    it("should clear the session cookie with Max-Age=0", async () => {
      const { cookie } = await authenticateViaEmail(app, faker.internet.email())

      const response = await request(app.getHttpServer())
        .post("/logout")
        .set("Cookie", extractCookieValue(cookie))
        .expect(NO_CONTENT)

      const setCookie = Array.isArray(response.headers["set-cookie"])
        ? response.headers["set-cookie"][0]
        : response.headers["set-cookie"]

      expect(setCookie).toContain("garmr.sid=")
      expect(setCookie).toContain("Max-Age=0")
      expect(setCookie.toLowerCase()).toContain("httponly")
      expect(setCookie.toLowerCase()).toContain("secure")
      expect(setCookie.toLowerCase()).toContain("samesite=lax")
      expect(setCookie).toContain("Path=/")
    })

  })

  describe("When a request is made without a session cookie", () => {
    it(`should respond with HTTP ${NO_CONTENT}`, async () => {
      await request(app.getHttpServer())
        .post("/logout")
        .expect(NO_CONTENT)
    })
  })
})

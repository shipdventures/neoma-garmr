import { faker } from "@faker-js/faker"
import { MAGIC_LINK_AUDIENCE, SESSION_AUDIENCE } from "@lib"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { mailpit } from "fixtures/email/mailpit"
import {
  authenticateViaEmail,
  extractCookieValue,
} from "fixtures/fakes/magic-link"
import * as jwt from "jsonwebtoken"
import request from "supertest"
import { v4 } from "uuid"

const { OK, UNAUTHORIZED } = HttpStatus

const UNAUTHORIZED_BODY = {
  statusCode: UNAUTHORIZED,
  message:
    "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  error: "Unauthorized",
}

const appModules: [string, string][] = [
  ["forRoot", "src/core/app.module.ts#AppModule"],
  ["forRootAsync", "src/core/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`GET /me (Cookie) (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    afterEach(() => mailpit.clear())

    describe("When a request is made with a valid session cookie", () => {
      it("should respond with HTTP OK and the authenticated user", async () => {
        const email = faker.internet.email()
        const { cookie, user } = await authenticateViaEmail(app, email)

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", extractCookieValue(cookie))
          .expect(OK)
          .expect({ id: user.id, email: user.email })
      })

      it("should return different users for different cookies", async () => {
        const userA = await authenticateViaEmail(app, faker.internet.email())
        const userB = await authenticateViaEmail(app, faker.internet.email())

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", extractCookieValue(userA.cookie))
          .expect(OK)
          .expect({ id: userA.user.id, email: userA.user.email })

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", extractCookieValue(userB.cookie))
          .expect(OK)
          .expect({ id: userB.user.id, email: userB.user.email })
      })
    })

    describe("When the verify endpoint responds", () => {
      it("should include a Set-Cookie header with garmr.sid, HttpOnly, Secure, SameSite=Lax, and Path=/", async () => {
        const { cookie } = await authenticateViaEmail(
          app,
          faker.internet.email(),
        )

        expect(cookie).toContain("garmr.sid=")
        expect(cookie.toLowerCase()).toContain("httponly")
        expect(cookie.toLowerCase()).toContain("secure")
        expect(cookie.toLowerCase()).toContain("samesite=lax")
        expect(cookie).toContain("Path=/")
        expect(cookie).toContain("Max-Age=")
      })
    })

    describe("When a request is made without a cookie", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        await request(app.getHttpServer())
          .get("/me")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with an expired session token in the cookie", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const token = jwt.sign(
          { sub: v4(), aud: SESSION_AUDIENCE },
          process.env.GARMR_SECRET!,
          { expiresIn: -10 },
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with a cookie signed with the wrong secret", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const token = jwt.sign(
          { sub: v4(), aud: SESSION_AUDIENCE },
          "wrong-secret",
          { expiresIn: "1h" },
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with an alg=none token in the cookie", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
          "base64url",
        )
        const payload = Buffer.from(
          `{"sub":"${v4()}","aud":"${SESSION_AUDIENCE}"}`,
        ).toString("base64url")
        const token = `${header}.${payload}.`

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with a cookie for a non-existent user", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const token = jwt.sign(
          { sub: v4(), aud: SESSION_AUDIENCE },
          process.env.GARMR_SECRET!,
          { expiresIn: "1h" },
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with a cookie missing the sub claim", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const token = jwt.sign(
          { aud: SESSION_AUDIENCE },
          process.env.GARMR_SECRET!,
          { expiresIn: "1h" },
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When a request is made with a cookie with wrong audience", () => {
      it("should respond with HTTP UNAUTHORIZED", async () => {
        const token = jwt.sign(
          { sub: v4(), aud: MAGIC_LINK_AUDIENCE },
          process.env.GARMR_SECRET!,
          { expiresIn: "1h" },
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Cookie", `garmr.sid=${token}`)
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When both Bearer and Cookie are present", () => {
      it("should authenticate via Bearer (Bearer takes priority)", async () => {
        const bearerUser = await authenticateViaEmail(
          app,
          faker.internet.email(),
        )
        const cookieUser = await authenticateViaEmail(
          app,
          faker.internet.email(),
        )

        await request(app.getHttpServer())
          .get("/me")
          .set("Authorization", `Bearer ${bearerUser.token}`)
          .set("Cookie", extractCookieValue(cookieUser.cookie))
          .expect(OK)
          .expect({ id: bearerUser.user.id, email: bearerUser.user.email })
      })
    })
  })
})

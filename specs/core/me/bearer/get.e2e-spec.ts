import { faker } from "@faker-js/faker"
import { MAGIC_LINK_AUDIENCE, SESSION_AUDIENCE } from "@neoma/garmr"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { mailpit } from "fixtures/email/mailpit"
import { authenticateViaEmail } from "fixtures/fakes/magic-link"
import * as jwt from "jsonwebtoken"
import * as request from "supertest"
import { v4 } from "uuid"

const { OK, UNAUTHORIZED } = HttpStatus

const UNAUTHORIZED_BODY = {
  statusCode: UNAUTHORIZED,
  message:
    "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  error: "Unauthorized",
}

describe("GET /me (Bearer)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  afterEach(() => mailpit.clear())

  describe("When a request is made with a valid Bearer token", () => {
    it("should respond with HTTP OK and the authenticated user", async () => {
      const email = faker.internet.email()
      const { token, user } = await authenticateViaEmail(app, email)

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(OK)
        .expect({ id: user.id, email: user.email })
    })

    it("should return different users for different tokens", async () => {
      const userA = await authenticateViaEmail(app, faker.internet.email())
      const userB = await authenticateViaEmail(app, faker.internet.email())

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(OK)
        .expect({ id: userA.user.id, email: userA.user.email })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(OK)
        .expect({ id: userB.user.id, email: userB.user.email })
    })
  })

  describe("When a request is made without an Authorization header", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a malformed Bearer header", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", "Bearer not-a-jwt")
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with an expired session token", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      const token = jwt.sign(
        { sub: v4(), aud: SESSION_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: -10 },
      )

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token signed with the wrong secret", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      const token = jwt.sign(
        { sub: v4(), aud: SESSION_AUDIENCE },
        "wrong-secret",
        { expiresIn: "1h" },
      )

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with an alg=none token", () => {
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
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token for a non-existent user", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      const token = jwt.sign(
        { sub: v4(), aud: SESSION_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "1h" },
      )

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token missing the sub claim", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      const token = jwt.sign(
        { aud: SESSION_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "1h" },
      )

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token with wrong audience", () => {
    it("should respond with HTTP UNAUTHORIZED", async () => {
      const token = jwt.sign(
        { sub: v4(), aud: MAGIC_LINK_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "1h" },
      )

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })
})

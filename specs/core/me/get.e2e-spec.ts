import { faker } from "@faker-js/faker/."
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { credentials } from "fixtures/fakes/credentials"
import * as jwt from "jsonwebtoken"
import * as request from "supertest"
import { v4 } from "uuid"

const { CREATED, OK, UNAUTHORIZED } = HttpStatus

const UNAUTHORIZED_BODY = {
  statusCode: UNAUTHORIZED,
  message:
    "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  error: "Unauthorized",
}

describe("GET /me", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  describe("When a request is made with a valid token", () => {
    it("Then it should respond with HTTP OK and the authenticated user.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      // Register
      const { body: registered } = await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      // Access protected route
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${registered.token}`)
        .expect(OK)
        .expect({ id: registered.id, email: registered.email })
    })

    it("Then different tokens should return different users.", async () => {
      // Register first user
      const { body: userA } = await request(app.getHttpServer())
        .post("/credentials")
        .send({
          email: faker.internet.email(),
          password: credentials.password(),
        })
        .expect(CREATED)

      // Register second user
      const { body: userB } = await request(app.getHttpServer())
        .post("/credentials")
        .send({
          email: faker.internet.email(),
          password: credentials.password(),
        })
        .expect(CREATED)

      // Access /me with each token and verify isolation
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(OK)
        .expect({ id: userA.id, email: userA.email })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(OK)
        .expect({ id: userB.id, email: userB.email })
    })
  })

  describe("When a request is made without a token", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a malformed token", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", "Bearer not-a-jwt")
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with an expired token", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const token = jwt.sign({ sub: v4() }, process.env.GARMR_SECRET!, {
        expiresIn: -10,
      })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token that is not yet valid (nbf)", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const token = jwt.sign({ sub: v4() }, process.env.GARMR_SECRET!, {
        notBefore: "1d",
      })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token signed with the wrong secret", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const token = jwt.sign({ sub: v4() }, "wrong-secret", { expiresIn: "1h" })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with an alg=none token", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
        "base64url",
      )
      const payload = Buffer.from(`{"sub":"${v4()}"}`).toString("base64url")
      const token = `${header}.${payload}.`

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token for a non-existent user", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const token = jwt.sign({ sub: v4() }, process.env.GARMR_SECRET!, {
        expiresIn: "1h",
      })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })

  describe("When a request is made with a token missing the sub claim", () => {
    it("Then it should respond with HTTP UNAUTHORIZED.", async () => {
      const token = jwt.sign({}, process.env.GARMR_SECRET!, { expiresIn: "1h" })

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(UNAUTHORIZED)
        .expect(UNAUTHORIZED_BODY)
    })
  })
})

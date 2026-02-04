import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import * as jwt from "jsonwebtoken"
import * as request from "supertest"
import { DataSource } from "typeorm"

const { OK, UNAUTHORIZED } = HttpStatus
const MAGIC_LINK_AUDIENCE = "magic-link"
const SESSION_AUDIENCE = "session"

describe("GET /magic-link/verify", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let datasource: DataSource

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
    datasource = app.get(DataSource)
  })

  describe("When called with a valid token for a new email", () => {
    const emailCases = [
      { desc: "lowercase", email: faker.internet.email().toLowerCase() },
      { desc: "UPPERCASE", email: faker.internet.email().toUpperCase() },
      { desc: "MiXeD CaSe", email: "TeSt.UsEr@ExAmPlE.cOm" },
    ]

    emailCases.forEach(({ desc, email }) => {
      describe(`with ${desc} email: ${email}`, () => {
        it("should respond with HTTP 200, normalized email, and isNewUser: true", async () => {
          const token = jwt.sign(
            { email, aud: MAGIC_LINK_AUDIENCE },
            process.env.GARMR_SECRET!,
            { expiresIn: "15m" },
          )

          const response = await request(app.getHttpServer())
            .get("/magic-link/verify")
            .query({ token })
            .expect(OK)

          expect(response.body).toMatchObject({
            user: {
              email: email.toLowerCase(),
            },
            isNewUser: true,
          })
          expect(response.body.user.id).toBeDefined()
          expect(response.body.token).toBeDefined()

          // Verify the session token is valid and has correct audience
          const payload = jwt.verify(
            response.body.token as string,
            process.env.GARMR_SECRET!,
          ) as jwt.JwtPayload
          expect(payload).toMatchObject({
            sub: response.body.user.id,
            aud: SESSION_AUDIENCE,
          })
        })
      })
    })
  })

  describe("When called with a valid token for an existing email", () => {
    it("should respond with HTTP 200 and return the existing user", async () => {
      const email = faker.internet.email().toLowerCase()

      // Create user first
      const repo = datasource.getRepository("User")
      const existingUser = repo.create({ email })
      await repo.save(existingUser)

      const token = jwt.sign(
        { email, aud: MAGIC_LINK_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "15m" },
      )

      const response = await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(OK)

      expect(response.body).toMatchObject({
        user: {
          id: (existingUser as any).id,
          email,
        },
        isNewUser: false,
      })
    })

    it("should find existing user with case-insensitive email lookup", async () => {
      const email = "existing@example.com"

      const repo = datasource.getRepository("User")
      const existingUser = repo.create({ email })
      await repo.save(existingUser)

      // Token has uppercase email
      const token = jwt.sign(
        { email: "EXISTING@EXAMPLE.COM", aud: MAGIC_LINK_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "15m" },
      )

      const response = await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(OK)

      expect(response.body).toMatchObject({
        user: {
          id: (existingUser as any).id,
        },
        isNewUser: false,
      })
    })
  })

  describe("When called with an expired token", () => {
    it("should respond with HTTP 401", async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: MAGIC_LINK_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: -10 },
      )

      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Token has expired.",
        })
    })
  })

  describe("When called with an invalid signature", () => {
    it("should respond with HTTP 401", async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: MAGIC_LINK_AUDIENCE },
        "wrong-secret",
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Token signature is invalid.",
        })
    })
  })

  describe("When called with a token missing the email claim", () => {
    it("should respond with HTTP 401", async () => {
      const token = jwt.sign(
        { aud: MAGIC_LINK_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Invalid magic link token: missing email claim",
          reason: "missing email claim",
          error: "Unauthorized",
        })
    })
  })

  describe("When called with a token with wrong audience", () => {
    it("should respond with HTTP 401 when aud is 'session'", async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: SESSION_AUDIENCE },
        process.env.GARMR_SECRET!,
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Invalid magic link token: invalid audience",
          reason: "invalid audience",
          error: "Unauthorized",
        })
    })

    it("should respond with HTTP 401 when aud is missing", async () => {
      const token = jwt.sign(
        { email: faker.internet.email() },
        process.env.GARMR_SECRET!,
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Invalid magic link token: invalid audience",
          reason: "invalid audience",
          error: "Unauthorized",
        })
    })
  })

  describe("When called without a token parameter", () => {
    it("should respond with HTTP 401", async () => {
      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Token signature is invalid.",
        })
    })
  })

  describe("When called with a malformed token", () => {
    it("should respond with HTTP 401", async () => {
      await request(app.getHttpServer())
        .get("/magic-link/verify")
        .query({ token: "not-a-valid-jwt" })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: "Token signature is invalid.",
        })
    })
  })
})

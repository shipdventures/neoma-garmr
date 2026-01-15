import { faker } from "@faker-js/faker/."
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { credentials } from "fixtures/fakes/credentials"
import * as request from "supertest"

const { BAD_REQUEST, CREATED, OK, UNAUTHORIZED } = HttpStatus

describe("POST /sessions", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  describe("When a request is made with a registered email and the correct password", () => {
    it("Then it should respond with a HTTP CREATED and a token.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      // First, register the user
      await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      // Then, login
      const { body } = await request(app.getHttpServer())
        .post("/sessions")
        .send({ email, password })
        .expect(CREATED)

      expect(body).toEqual({
        token: expect.toBeString(),
      })
    })

    it("Then it should issue a valid token for accessing protected routes.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      // Register
      const { body: registered } = await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      // Login
      const { body: session } = await request(app.getHttpServer())
        .post("/sessions")
        .send({ email, password })
        .expect(CREATED)

      // Access protected route with session token
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${session.token}`)
        .expect(OK)
        .expect({ id: registered.id, email: registered.email })
    })
  })

  describe("When a request is made with a registered email in a different case", () => {
    it("Then it should respond with a HTTP CREATED and a token.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      // Register with original case
      await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      // Login with uppercase
      const { body } = await request(app.getHttpServer())
        .post("/sessions")
        .send({ email: email.toUpperCase(), password })
        .expect(CREATED)

      expect(body).toEqual({
        token: expect.toBeString(),
      })
    })
  })

  describe("When a request is made with a registered email and an incorrect password", () => {
    it("Then it should respond with a HTTP UNAUTHORIZED error.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      // First, register the user
      await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      // Then, attempt login with wrong password
      await request(app.getHttpServer())
        .post("/sessions")
        .send({ email, password: credentials.password() })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: `Incorrect credentials provided for the identifier ${email}.`,
          identifier: email,
        })
    })
  })

  describe("When a request is made with an email that is not registered", () => {
    it("Then it should respond with a HTTP UNAUTHORIZED error.", async () => {
      const email = faker.internet.email()

      await request(app.getHttpServer())
        .post("/sessions")
        .send({
          email,
          password: credentials.password(),
        })
        .expect(UNAUTHORIZED)
        .expect({
          statusCode: UNAUTHORIZED,
          message: `Incorrect credentials provided for the identifier ${email}.`,
          identifier: email,
        })
    })
  })

  describe("When a request is made without an email", () => {
    it("Then it should respond with a HTTP BAD_REQUEST error.", () => {
      return request(app.getHttpServer())
        .post("/sessions")
        .send({
          password: credentials.password(),
        })
        .expect(BAD_REQUEST)
        .expect({
          message: ["Please enter your email address."],
          error: "Bad Request",
          statusCode: BAD_REQUEST,
        })
    })
  })

  credentials.invalidEmails().forEach((invalidEmail) => {
    describe(`When a request is made with the invalid email ${invalidEmail}`, () => {
      it("Then it should respond with a HTTP BAD_REQUEST error.", () => {
        return request(app.getHttpServer())
          .post("/sessions")
          .send({
            email: invalidEmail,
            password: credentials.password(),
          })
          .expect(BAD_REQUEST)
          .expect({
            message: ["Please enter a valid email address."],
            error: "Bad Request",
            statusCode: BAD_REQUEST,
          })
      })
    })
  })

  describe("When a request is made without a password", () => {
    it("Then it should respond with a HTTP BAD_REQUEST error.", () => {
      return request(app.getHttpServer())
        .post("/sessions")
        .send({
          email: faker.internet.email(),
        })
        .expect(BAD_REQUEST)
        .expect({
          message: ["Please enter your password."],
          error: "Bad Request",
          statusCode: BAD_REQUEST,
        })
    })
  })
})

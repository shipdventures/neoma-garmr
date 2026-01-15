import { faker } from "@faker-js/faker/."
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { credentials } from "fixtures/fakes/credentials"
import * as request from "supertest"

const { BAD_REQUEST, CONFLICT, CREATED, OK } = HttpStatus

describe("POST /credentials", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  describe("When a request is made with a valid email and a strong password", () => {
    it("Then it should respond with a HTTP CREATED and the created resource.", async () => {
      const resource = {
        email: faker.internet.email(),
        password: credentials.password(),
      }

      const { body } = await request(app.getHttpServer())
        .post("/credentials")
        .send(resource)
        .expect(CREATED)

      expect(body).toEqual({
        id: expect.toBeString(),
        email: resource.email.toLowerCase(),
        token: expect.toBeString(),
      })
    })

    it("Then it should issue a valid token for accessing protected routes.", async () => {
      const email = faker.internet.email()
      const password = credentials.password()

      const { body } = await request(app.getHttpServer())
        .post("/credentials")
        .send({ email, password })
        .expect(CREATED)

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${body.token}`)
        .expect(OK)
        .expect({ id: body.id, email: body.email })
    })
  })

  describe("When a request is made with an email that is already registered", () => {
    it("Then it should respond with a HTTP CONFLICT error.", async () => {
      const email = faker.internet.email()

      await request(app.getHttpServer())
        .post("/credentials")
        .send({
          email,
          password: credentials.password(),
        })
        .expect(CREATED)

      await request(app.getHttpServer())
        .post("/credentials")
        .send({
          email,
          password: credentials.password(),
        })
        .expect(CONFLICT)
        .expect({
          statusCode: CONFLICT,
          message: `The email ${email} is already registered.`,
          email: email,
          error: "Conflict",
        })
    })
  })

  describe("When a request is made without an email", () => {
    it("Then it should respond with a HTTP BAD_REQUEST error.", () => {
      return request(app.getHttpServer())
        .post("/credentials")
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
          .post("/credentials")
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
        .post("/credentials")
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

  credentials.weakPasswords().forEach((weakPassword) => {
    describe(`When a request is made with the weak password "${weakPassword}"`, () => {
      it("Then it should respond with a HTTP BAD_REQUEST error.", () => {
        return request(app.getHttpServer())
          .post("/credentials")
          .send({
            email: faker.internet.email(),
            password: weakPassword,
          })
          .expect(BAD_REQUEST)
          .expect({
            message: [
              "A strong password must be least 8 characters long and include at least 1 letter, 1 number, and 1 special character.",
            ],
            error: "Bad Request",
            statusCode: BAD_REQUEST,
          })
      })
    })
  })
})

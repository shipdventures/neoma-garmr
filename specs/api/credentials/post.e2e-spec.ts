import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { credentials } from "fixtures/fakes/credentials"
import * as request from "supertest"

const { BAD_REQUEST, CONFLICT, CREATED, OK } = HttpStatus

describe("POST /credentials (schematic-generated)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("src/api/app.module.ts#AppModule")
  })

  describe("When a request is made with a valid email and a strong password", () => {
    it("should respond with HTTP CREATED and the created resource", async () => {
      const resource = {
        email: faker.internet.email(),
        password: credentials.password(),
      }

      const { body } = await request(app.getHttpServer())
        .post("/credentials")
        .send(resource)
        .expect(CREATED)

      expect(body).toMatchObject({
        id: expect.toBeString(),
        email: resource.email.toLowerCase(),
      })
    })

    it("should set an HttpOnly cookie that grants access to protected routes", async () => {
      const resource = {
        email: faker.internet.email(),
        password: credentials.password(),
      }

      const response = await request(app.getHttpServer())
        .post("/credentials")
        .send(resource)
        .expect(CREATED)

      const cookies = response.headers["set-cookie"]
      expect(cookies).toBeDefined()
      expect(cookies[0]).toContain("HttpOnly")
      expect(cookies[0]).toContain("Secure")
      expect(cookies[0]).toContain("SameSite=Strict")

      await request(app.getHttpServer())
        .get("/me")
        .set("Cookie", cookies)
        .expect(OK)
        .expect({
          id: response.body.id,
          email: resource.email.toLowerCase(),
        })
    })
  })

  describe("When a request is made with an email that is already registered", () => {
    it("should respond with HTTP CONFLICT", async () => {
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
    it("should respond with HTTP BAD_REQUEST", () => {
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
      it("should respond with HTTP BAD_REQUEST", () => {
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
    it("should respond with HTTP BAD_REQUEST", () => {
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
      it("should respond with HTTP BAD_REQUEST", () => {
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

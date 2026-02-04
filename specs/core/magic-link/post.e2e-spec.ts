import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import { mailpit } from "fixtures/email/mailpit"
import { credentials } from "fixtures/fakes/credentials"
import * as jwt from "jsonwebtoken"
import * as request from "supertest"

const { ACCEPTED, BAD_REQUEST } = HttpStatus
const FIFTEEN_MINUTES = 900
const email = faker.internet.email()

describe("POST /magic-link", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
  })

  describe(`When a request is made with the valid email ${email}`, () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ["setImmediate"] })
    })

    afterEach(() => {
      jest.useRealTimers()
      return mailpit.clear()
    })

    it(`should respond with a HTTP ${ACCEPTED} and send a magic link email`, async () => {
      const email = faker.internet.email()

      await request(app.getHttpServer())
        .post("/magic-link")
        .send({ email })
        .expect(ACCEPTED)

      const { messages } = await mailpit.messages()
      const message = await mailpit.message(messages[0].ID as string)

      // Sent from correct email
      expect(message.From.Address.toLowerCase()).toBe(
        process.env.MAGIC_LINK_FROM!.toLowerCase(),
      )

      // Sent to correct email
      expect(messages[0].To[0].Address.toLowerCase()).toBe(email.toLowerCase())

      // Includes the correct url with token query parameter.
      const verificationUrl = message.Text.match(
        /[a-z]+[:.].*?(?=\s)/,
      )[0] as string

      // Base url is correct
      expect(verificationUrl).toContain(process.env.APP_URL!)

      const token = verificationUrl.substring(verificationUrl.indexOf("=") + 1)

      // Verify correct signature.
      const details = jwt.verify(token, process.env.GARMR_SECRET!) as Record<
        string,
        any
      >

      // Sent to the correct email address.
      expect(details.email).toBe(email)

      // Has correct audience.
      expect(details.aud).toBe("magic-link")

      // Has correct iat and exp claims.
      expect(details.iat).toEqual(Math.floor(Date.now() / 1000))
      expect(details.exp).toEqual(details.iat + FIFTEEN_MINUTES)
    })
  })

  credentials.invalidEmails().forEach((email) => {
    describe(`When it's called with the invalid email ${email}`, () => {
      it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
        return request(app.getHttpServer())
          .post("/magic-link")
          .send({ email })
          .expect(BAD_REQUEST)
          .expect({
            message: ["Please enter a valid email address."],
            error: "Bad Request",
            statusCode: 400,
          })
      })
    })
  })

  describe("When it's called with a blank email address", () => {
    it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
      return request(app.getHttpServer())
        .post("/magic-link")
        .send({ email: "" })
        .expect(BAD_REQUEST)
        .expect({
          message: ["Please enter your email address."],
          error: "Bad Request",
          statusCode: 400,
        })
    })
  })

  describe("When it's called without an email address", () => {
    it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
      return request(app.getHttpServer())
        .post("/magic-link")
        .send({})
        .expect(BAD_REQUEST)
        .expect({
          message: ["Please enter your email address."],
          error: "Bad Request",
          statusCode: 400,
        })
    })
  })
})

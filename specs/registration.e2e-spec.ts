import { managedAppInstance } from "@neoma/managed-app"
import * as request from "supertest"
import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

const { CREATED } = HttpStatus

describe("Registration (API)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeAll(async () => {
    app = await managedAppInstance()
  })

  it(`it should respond with an HTTP ${CREATED} when called with valid registration data that includes and email that isn't already in registered`, async () => {
    const registrationData = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    const { body } = await request(app.getHttpServer())
      .post("/registration")
      .send(registrationData)
      .expect(CREATED)

    expect(body).toEqual({
      id: expect.any(String),
      email: registrationData.email.toLowerCase(),
    })
  })
})

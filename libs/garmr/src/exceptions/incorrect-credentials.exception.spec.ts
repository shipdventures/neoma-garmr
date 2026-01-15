import { faker } from "@faker-js/faker/."
import { HttpStatus } from "@nestjs/common"

import { IncorrectCredentialsException } from "./incorrect-credentials.exception"

const { UNAUTHORIZED } = HttpStatus

describe("IncorrectCredentialsException", () => {
  const email = faker.internet.email()
  const message = `Incorrect credentials provided for the identifier ${email}.`
  let exception: IncorrectCredentialsException

  beforeEach(() => {
    exception = new IncorrectCredentialsException(email)
  })

  it("should have the identifier property", () => {
    expect(exception.identifier).toBe(email)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(message)
  })

  describe("getStatus", () => {
    it("should return 401 (Unauthorized)", () => {
      expect(exception.getStatus()).toBe(UNAUTHORIZED)
    })
  })

  describe("getResponse", () => {
    it("should return the error details", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: UNAUTHORIZED,
        message,
        identifier: email,
      })
    })
  })
})

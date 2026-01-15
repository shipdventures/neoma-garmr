import { faker } from "@faker-js/faker/."
import { HttpStatus } from "@nestjs/common"

import { InvalidCredentialsException } from "./invalid-credentials.exception"

const { UNAUTHORIZED } = HttpStatus

describe("InvalidCredentialsException", () => {
  const message = faker.hacker.phrase()
  let exception: InvalidCredentialsException

  beforeEach(() => {
    exception = new InvalidCredentialsException(message)
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
      })
    })
  })
})

import { faker } from "@faker-js/faker/."
import { HttpStatus } from "@nestjs/common"
import { EmailAlreadyExistsException } from "@lib"

const { CONFLICT } = HttpStatus

describe("EmailAlreadyExistsException", () => {
  const email = faker.internet.email()
  const message = `The email ${email} is already registered.`
  let exception: EmailAlreadyExistsException

  beforeEach(() => {
    exception = new EmailAlreadyExistsException(email)
  })

  it("should have the email property", () => {
    expect(exception.email).toBe(email)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(message)
  })

  describe("getStatus", () => {
    it("should return 409 (Conflict)", () => {
      expect(exception.getStatus()).toBe(CONFLICT)
    })
  })

  describe("getResponse", () => {
    it("should return the error details", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: CONFLICT,
        message,
        email,
      })
    })
  })
})

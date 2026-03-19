import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { PermissionDeniedException } from "./permission-denied.exception"

const { FORBIDDEN } = HttpStatus

describe("PermissionDeniedException", () => {
  const permission = `${faker.hacker.verb()}:${faker.hacker.noun()}`
  let exception: PermissionDeniedException

  beforeEach(() => {
    exception = new PermissionDeniedException(permission)
  })

  it("should have the permission property", () => {
    expect(exception.permission).toBe(permission)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(
      `Permission denied: ${permission} is required.`,
    )
  })

  describe("getStatus", () => {
    it("should return 403 (Forbidden)", () => {
      expect(exception.getStatus()).toBe(FORBIDDEN)
    })
  })

  describe("getResponse", () => {
    it("should return the error details", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: FORBIDDEN,
        message: `Permission denied: ${permission} is required.`,
        permission,
      })
    })
  })
})

import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { PermissionDeniedException } from "./permission-denied.exception"

const { FORBIDDEN } = HttpStatus

describe("PermissionDeniedException", () => {
  const requiredPermissions = [
    `${faker.hacker.verb()}:${faker.hacker.noun()}`,
    `${faker.hacker.verb()}:${faker.hacker.noun()}`,
  ]
  const identifier = faker.string.uuid()
  const permissions = [`${faker.hacker.verb()}:${faker.hacker.noun()}`]

  describe("Given mode is all", () => {
    let exception: PermissionDeniedException

    beforeEach(() => {
      exception = new PermissionDeniedException(
        requiredPermissions,
        "all",
        identifier,
        permissions,
      )
    })

    it("should have the requiredPermissions property", () => {
      expect(exception.requiredPermissions).toEqual(requiredPermissions)
    })

    it("should have the identifier property", () => {
      expect(exception.identifier).toBe(identifier)
    })

    it("should have the permissions property", () => {
      expect(exception.permissions).toEqual(permissions)
    })

    it("should join required permissions with comma in the message", () => {
      expect(exception.message).toBe(
        `Permission denied: ${requiredPermissions.join(", ")} is required.`,
      )
    })

    it("should return 403 (Forbidden)", () => {
      expect(exception.getStatus()).toBe(FORBIDDEN)
    })

    it("should include requiredPermissions and permissions in the response", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: FORBIDDEN,
        message: `Permission denied: ${requiredPermissions.join(", ")} is required.`,
        requiredPermissions,
        permissions,
      })
    })
  })

  describe("Given mode is any", () => {
    let exception: PermissionDeniedException

    beforeEach(() => {
      exception = new PermissionDeniedException(
        requiredPermissions,
        "any",
        identifier,
        permissions,
      )
    })

    it("should join required permissions with pipe in the message", () => {
      expect(exception.message).toBe(
        `Permission denied: ${requiredPermissions.join(" | ")} is required.`,
      )
    })
  })

  describe("Given no identifier or permissions", () => {
    let exception: PermissionDeniedException

    beforeEach(() => {
      exception = new PermissionDeniedException(["read:users"], "all")
    })

    it("should have undefined identifier", () => {
      expect(exception.identifier).toBeUndefined()
    })

    it("should return empty permissions array in response", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: FORBIDDEN,
        message: "Permission denied: read:users is required.",
        requiredPermissions: ["read:users"],
        permissions: [],
      })
    })
  })
})

import { faker } from "@faker-js/faker"

import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { PermissionService } from "./permission.service"

describe("PermissionService", () => {
  let service: PermissionService

  beforeEach(() => {
    service = new PermissionService()
  })

  const createPrincipal = (permissions: string[] = []): Authenticatable => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    permissions,
  })

  describe("hasPermission()", () => {
    describe("Given a principal with no permissions", () => {
      it("should return false for any permission", () => {
        const principal = createPrincipal([])
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })
    })

    describe("Given a principal with undefined permissions", () => {
      it("should return false for any permission", () => {
        const principal: Authenticatable = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        }
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })
    })

    describe("Given exact permission match", () => {
      it("should return true", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
      })

      it("should return false for different permission", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasPermission(principal, "write:users")).toBe(false)
      })
    })

    describe("Given superuser wildcard (*)", () => {
      it("should match any permission", () => {
        const principal = createPrincipal(["*"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "delete:posts")).toBe(true)
        expect(service.hasPermission(principal, "admin")).toBe(true)
      })
    })

    describe("Given action wildcard (*:resource)", () => {
      it("should match any action on that resource", () => {
        const principal = createPrincipal(["*:users"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "write:users")).toBe(true)
        expect(service.hasPermission(principal, "delete:users")).toBe(true)
      })

      it("should not match other resources", () => {
        const principal = createPrincipal(["*:users"])
        expect(service.hasPermission(principal, "read:posts")).toBe(false)
      })
    })

    describe("Given resource wildcard (action:*)", () => {
      it("should match that action on any resource", () => {
        const principal = createPrincipal(["read:*"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "read:posts")).toBe(true)
        expect(service.hasPermission(principal, "read:comments")).toBe(true)
      })

      it("should not match other actions", () => {
        const principal = createPrincipal(["read:*"])
        expect(service.hasPermission(principal, "write:users")).toBe(false)
      })
    })

    describe("Given a permission without resource part", () => {
      it("should only match exact permission or superuser", () => {
        const principal = createPrincipal(["admin"])
        expect(service.hasPermission(principal, "admin")).toBe(true)
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })

      it("should be matched by superuser wildcard", () => {
        const principal = createPrincipal(["*"])
        expect(service.hasPermission(principal, "admin")).toBe(true)
      })
    })
  })

  describe("hasAllPermissions()", () => {
    describe("Given a principal with all required permissions", () => {
      it("should return true", () => {
        const principal = createPrincipal([
          "read:users",
          "write:users",
          "delete:users",
        ])
        expect(
          service.hasAllPermissions(principal, ["read:users", "write:users"]),
        ).toBe(true)
      })
    })

    describe("Given a principal missing one permission", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:users"])
        expect(
          service.hasAllPermissions(principal, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("Given an empty required permissions array", () => {
      it("should return true", () => {
        const principal = createPrincipal([])
        expect(service.hasAllPermissions(principal, [])).toBe(true)
      })
    })

    describe("Given a superuser", () => {
      it("should return true for any permissions", () => {
        const principal = createPrincipal(["*"])
        expect(
          service.hasAllPermissions(principal, [
            "read:users",
            "write:posts",
            "admin",
          ]),
        ).toBe(true)
      })
    })
  })

  describe("hasAnyPermission()", () => {
    describe("Given a principal with one matching permission", () => {
      it("should return true", () => {
        const principal = createPrincipal(["read:users"])
        expect(
          service.hasAnyPermission(principal, ["read:users", "write:users"]),
        ).toBe(true)
      })
    })

    describe("Given a principal with no matching permissions", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:posts"])
        expect(
          service.hasAnyPermission(principal, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("Given an empty required permissions array", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasAnyPermission(principal, [])).toBe(false)
      })
    })
  })

  describe("requirePermission()", () => {
    describe("Given a principal with the required permission", () => {
      it("should not throw", () => {
        const principal = createPrincipal(["read:users"])
        expect(() =>
          service.requirePermission(principal, "read:users"),
        ).not.toThrow()
      })
    })

    describe("Given a principal without the required permission", () => {
      it("should throw PermissionDeniedException", () => {
        const principal = createPrincipal(["read:posts"])
        expect(() =>
          service.requirePermission(principal, "read:users"),
        ).toThrow(PermissionDeniedException)
      })

      it("should include the required permission in the exception", () => {
        const principal = createPrincipal([])
        try {
          service.requirePermission(principal, "delete:users")
          fail("Expected PermissionDeniedException to be thrown")
        } catch (error) {
          expect(error).toBeInstanceOf(PermissionDeniedException)
          expect((error as PermissionDeniedException).permission).toBe(
            "delete:users",
          )
        }
      })
    })
  })

  describe("requireAllPermissions()", () => {
    describe("Given a principal with all required permissions", () => {
      it("should not throw", () => {
        const principal = createPrincipal(["read:users", "write:users"])
        expect(() =>
          service.requireAllPermissions(principal, [
            "read:users",
            "write:users",
          ]),
        ).not.toThrow()
      })
    })

    describe("Given a principal missing one permission", () => {
      it("should throw PermissionDeniedException for the missing permission", () => {
        const principal = createPrincipal(["read:users"])
        try {
          service.requireAllPermissions(principal, [
            "read:users",
            "write:users",
          ])
          fail("Expected PermissionDeniedException to be thrown")
        } catch (error) {
          expect(error).toBeInstanceOf(PermissionDeniedException)
          expect((error as PermissionDeniedException).permission).toBe(
            "write:users",
          )
        }
      })
    })
  })

  describe("requireAnyPermission()", () => {
    describe("Given a principal with one matching permission", () => {
      it("should not throw", () => {
        const principal = createPrincipal(["read:users"])
        expect(() =>
          service.requireAnyPermission(principal, [
            "read:users",
            "write:users",
          ]),
        ).not.toThrow()
      })
    })

    describe("Given a principal with no matching permissions", () => {
      it("should throw PermissionDeniedException", () => {
        const principal = createPrincipal(["read:posts"])
        expect(() =>
          service.requireAnyPermission(principal, [
            "read:users",
            "write:users",
          ]),
        ).toThrow(PermissionDeniedException)
      })

      it("should include all required permissions joined with | in the exception", () => {
        const principal = createPrincipal([])
        try {
          service.requireAnyPermission(principal, ["read:users", "write:users"])
          fail("Expected PermissionDeniedException to be thrown")
        } catch (error) {
          expect(error).toBeInstanceOf(PermissionDeniedException)
          expect((error as PermissionDeniedException).permission).toBe(
            "read:users | write:users",
          )
        }
      })
    })
  })
})

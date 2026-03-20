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
    describe("When called with a principal that has no permissions", () => {
      it("should return false for read:users", () => {
        const principal = createPrincipal([])
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })
    })

    describe("When called with a principal that has undefined permissions", () => {
      it("should return false for read:users", () => {
        const principal: Authenticatable = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        }
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })
    })

    describe("When called with a principal that has read:users", () => {
      it("should return true for read:users", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
      })

      it("should return false for write:users", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasPermission(principal, "write:users")).toBe(false)
      })
    })

    describe("When called with a principal that has *", () => {
      it("should return true for any permission", () => {
        const principal = createPrincipal(["*"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "delete:posts")).toBe(true)
        expect(service.hasPermission(principal, "admin")).toBe(true)
      })
    })

    describe("When called with a principal that has *:users", () => {
      it("should return true for any action on users", () => {
        const principal = createPrincipal(["*:users"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "write:users")).toBe(true)
        expect(service.hasPermission(principal, "delete:users")).toBe(true)
      })

      it("should return false for other resources", () => {
        const principal = createPrincipal(["*:users"])
        expect(service.hasPermission(principal, "read:posts")).toBe(false)
      })
    })

    describe("When called with a principal that has read:*", () => {
      it("should return true for read on any resource", () => {
        const principal = createPrincipal(["read:*"])
        expect(service.hasPermission(principal, "read:users")).toBe(true)
        expect(service.hasPermission(principal, "read:posts")).toBe(true)
        expect(service.hasPermission(principal, "read:comments")).toBe(true)
      })

      it("should return false for other actions", () => {
        const principal = createPrincipal(["read:*"])
        expect(service.hasPermission(principal, "write:users")).toBe(false)
      })
    })

    describe("When called with a principal that has admin (single-segment)", () => {
      it("should return true for admin", () => {
        const principal = createPrincipal(["admin"])
        expect(service.hasPermission(principal, "admin")).toBe(true)
      })

      it("should return false for read:users", () => {
        const principal = createPrincipal(["admin"])
        expect(service.hasPermission(principal, "read:users")).toBe(false)
      })

      it("should be matched by *", () => {
        const principal = createPrincipal(["*"])
        expect(service.hasPermission(principal, "admin")).toBe(true)
      })
    })
  })

  describe("hasAllPermissions()", () => {
    describe("When called with a principal that has all required permissions", () => {
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

    describe("When called with a principal missing one permission", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:users"])
        expect(
          service.hasAllPermissions(principal, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should return true", () => {
        const principal = createPrincipal([])
        expect(service.hasAllPermissions(principal, [])).toBe(true)
      })
    })

    describe("When called with a principal that has *", () => {
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
    describe("When called with a principal that has one matching permission", () => {
      it("should return true", () => {
        const principal = createPrincipal(["read:users"])
        expect(
          service.hasAnyPermission(principal, ["read:users", "write:users"]),
        ).toBe(true)
      })
    })

    describe("When called with a principal that has no matching permissions", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:posts"])
        expect(
          service.hasAnyPermission(principal, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should return false", () => {
        const principal = createPrincipal(["read:users"])
        expect(service.hasAnyPermission(principal, [])).toBe(false)
      })
    })
  })

  describe("requirePermission()", () => {
    describe("When called with a principal that has the required permission", () => {
      it("should not throw", () => {
        const principal = createPrincipal(["read:users"])
        expect(() =>
          service.requirePermission(principal, "read:users"),
        ).not.toThrow()
      })
    })

    describe("When called with a principal that lacks the required permission", () => {
      it("should throw PermissionDeniedException with context", () => {
        const principal = createPrincipal(["read:posts"])
        expect(() =>
          service.requirePermission(principal, "delete:users"),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["delete:users"],
          identifier: principal.id,
          permissions: ["read:posts"],
        })
      })
    })
  })

  describe("requireAllPermissions()", () => {
    describe("When called with a principal that has all required permissions", () => {
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

    describe("When called with a principal missing one permission", () => {
      it("should throw with the missing permission", () => {
        const principal = createPrincipal(["read:users"])
        expect(() =>
          service.requireAllPermissions(principal, [
            "read:users",
            "write:users",
          ]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["write:users"],
          identifier: principal.id,
          permissions: ["read:users"],
        })
      })
    })

    describe("When called with a principal missing multiple permissions", () => {
      it("should throw with all missing permissions", () => {
        const principal = createPrincipal(["delete:users"])
        expect(() =>
          service.requireAllPermissions(principal, [
            "read:users",
            "write:users",
          ]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["read:users", "write:users"],
          identifier: principal.id,
          permissions: ["delete:users"],
        })
      })
    })
  })

  describe("requireAnyPermission()", () => {
    describe("When called with a principal that has one matching permission", () => {
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

    describe("When called with a principal that has no matching permissions", () => {
      it("should throw with all required permissions", () => {
        const principal = createPrincipal(["read:posts"])
        expect(() =>
          service.requireAnyPermission(principal, [
            "read:users",
            "write:users",
          ]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["read:users", "write:users"],
          identifier: principal.id,
          permissions: ["read:posts"],
        })
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should throw with an empty requiredPermissions array", () => {
        const principal = createPrincipal(["read:users"])
        expect(() =>
          service.requireAnyPermission(principal, []),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: [],
          identifier: principal.id,
        })
      })
    })
  })

  describe("validateFormat()", () => {
    it.each(["*", "admin", "read:users", "*:users", "read:*"])(
      "should accept valid format: %s",
      (permission) => {
        expect(() => PermissionService.validateFormat(permission)).not.toThrow()
      },
    )

    it.each(["", "read:users:admin", "read::users", ":users", "read:", "::"])(
      "should throw on invalid format: %s",
      (permission) => {
        expect(() => PermissionService.validateFormat(permission)).toThrow(
          "Invalid permission format",
        )
      },
    )
  })
})

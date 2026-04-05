import { faker } from "@faker-js/faker"
import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, TestingModule } from "@nestjs/testing"
import { express, MockRequest } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"

import { RequiresAnyPermission } from "../decorators/requires-any-permission.decorator"
import { RequiresPermission } from "../decorators/requires-permission.decorator"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { Authenticatable } from "../interfaces/authenticatable.interface"
import { PermissionService } from "../services/permission.service"

import { RequiresPermissionGuard } from "./requires-permission.guard"

class NoPermissions {
  public handler(): void {}
}

class WithAndPermissions {
  @RequiresPermission("read:users", "write:users")
  public handler(): void {}
}

class WithAnyPermissions {
  @RequiresAnyPermission("admin", "delete:users")
  public handler(): void {}
}

class WithBothPermissions {
  @RequiresPermission("read:users")
  @RequiresAnyPermission("admin", "write:users")
  public handler(): void {}
}

@RequiresPermission("read:admin")
class ClassLevelPermissions {
  public handler(): void {}

  @RequiresPermission("write:admin")
  public restrictedHandler(): void {}

  @RequiresPermission("read:admin")
  public duplicateHandler(): void {}
}

describe("RequiresPermissionGuard", () => {
  let guard: RequiresPermissionGuard
  let request: MockRequest

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequiresPermissionGuard, Reflector, PermissionService],
    }).compile()

    guard = module.get(RequiresPermissionGuard)
    request = express.request()
  })

  const createPrincipal = (permissions: string[] = []): Authenticatable => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    permissions,
  })

  describe("When the request has no authenticated principal", () => {
    it("should throw UnauthorizedException", () => {
      const ctx = executionContext(request, express.response(), {
        controller: NoPermissions,
        method: "handler",
      })

      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
        },
      )
    })
  })

  describe("When the request has an authenticated principal", () => {
    describe("Given a handler with no permission decorators", () => {
      it("should return true", () => {
        request.principal = createPrincipal([])
        const ctx = executionContext(request, express.response(), {
          controller: NoPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })

    describe("Given a handler requiring read:users and write:users", () => {
      it("should allow a principal with both permissions", () => {
        request.principal = createPrincipal([
          "read:users",
          "write:users",
          "delete:users",
        ])
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })

      it("should deny a principal missing write:users", () => {
        request.principal = createPrincipal(["read:users"])
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["write:users"],
          },
        )
      })

      it("should allow a principal with *", () => {
        request.principal = createPrincipal(["*"])
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })

    describe("Given a handler requiring admin or delete:users", () => {
      it("should allow a principal with delete:users", () => {
        request.principal = createPrincipal(["delete:users"])
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })

      it("should deny a principal with neither", () => {
        request.principal = createPrincipal(["read:users"])
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["admin", "delete:users"],
          },
        )
      })
    })

    describe("Given a handler requiring read:users and (admin or write:users)", () => {
      it("should allow a principal with read:users and write:users", () => {
        request.principal = createPrincipal(["read:users", "write:users"])
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })

      it("should deny a principal with read:users but neither admin nor write:users", () => {
        request.principal = createPrincipal(["read:users"])
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["admin", "write:users"],
          },
        )
      })

      it("should deny a principal with admin but not read:users", () => {
        request.principal = createPrincipal(["admin"])
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["read:users"],
          },
        )
      })
    })

    describe("Given a controller requiring read:admin and a method requiring write:admin", () => {
      it("should allow a principal with both read:admin and write:admin", () => {
        request.principal = createPrincipal(["read:admin", "write:admin"])
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })

      it("should deny a principal with only read:admin", () => {
        request.principal = createPrincipal(["read:admin"])
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["write:admin"],
          },
        )
      })

      it("should deny a principal with only write:admin", () => {
        request.principal = createPrincipal(["write:admin"])
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          PermissionDeniedException,
          {
            requiredPermissions: ["read:admin"],
          },
        )
      })
    })

    describe("Given a controller requiring read:admin and a method with no additional permissions", () => {
      it("should allow a principal with read:admin", () => {
        request.principal = createPrincipal(["read:admin"])
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "handler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })

    describe("Given a controller and method both requiring read:admin", () => {
      it("should deduplicate and allow a principal with read:admin", () => {
        request.principal = createPrincipal(["read:admin"])
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "duplicateHandler",
        })

        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })
  })
})

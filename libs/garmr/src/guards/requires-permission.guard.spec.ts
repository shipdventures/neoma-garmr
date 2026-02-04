import { faker } from "@faker-js/faker"
import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, TestingModule } from "@nestjs/testing"
import { Request } from "express"
import { express } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"

import { REQUIRED_ANY_PERMISSIONS_KEY } from "../decorators/requires-any-permission.decorator"
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/requires-permission.decorator"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { Authenticatable } from "../interfaces/authenticatable.interface"
import { PermissionService } from "../services/permission.service"

import { RequiresPermissionGuard } from "./requires-permission.guard"

describe("RequiresPermissionGuard", () => {
  let guard: RequiresPermissionGuard
  let reflector: Reflector

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequiresPermissionGuard, Reflector, PermissionService],
    }).compile()

    guard = module.get(RequiresPermissionGuard)
    reflector = module.get(Reflector)
  })

  const createPrincipal = (permissions: string[] = []): Authenticatable => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    permissions,
  })

  describe("canActivate()", () => {
    let request: Partial<Request>
    let ctx: Partial<ExecutionContext>

    beforeEach(() => {
      request = express.request()
      ctx = executionContext(request, express.response())

      // Mock getHandler and getClass for Reflector
      ctx.getHandler = jest.fn().mockReturnValue(() => {})
      ctx.getClass = jest.fn().mockReturnValue(class {})
    })

    describe("When called without an authenticated principal", () => {
      beforeEach(() => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined)
      })

      it("should throw UnauthorizedException", () => {
        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          UnauthorizedException,
          {
            message:
              "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
          },
        )
      })
    })

    describe("When called with an authenticated principal", () => {
      describe("Given no permission requirements", () => {
        beforeEach(() => {
          request.principal = createPrincipal([])
          jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined)
        })

        it("should return true", () => {
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      describe("Given @RequiresPermission() metadata (AND logic)", () => {
        beforeEach(() => {
          jest
            .spyOn(reflector, "getAllAndOverride")
            .mockImplementation((key: string) => {
              if (key === REQUIRED_PERMISSIONS_KEY) {
                return ["read:users", "write:users"]
              }
              return undefined
            })
        })

        describe("When principal has all required permissions", () => {
          beforeEach(() => {
            request.principal = createPrincipal([
              "read:users",
              "write:users",
              "delete:users",
            ])
          })

          it("should return true", () => {
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })

        describe("When principal is missing one permission", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["read:users"])
          })

          it("should throw PermissionDeniedException", () => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(PermissionDeniedException, {
              permission: "write:users",
            })
          })
        })

        describe("When principal has superuser wildcard", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["*"])
          })

          it("should return true", () => {
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })
      })

      describe("Given @RequiresAnyPermission() metadata (OR logic)", () => {
        beforeEach(() => {
          jest
            .spyOn(reflector, "getAllAndOverride")
            .mockImplementation((key: string) => {
              if (key === REQUIRED_ANY_PERMISSIONS_KEY) {
                return ["admin", "delete:users"]
              }
              return undefined
            })
        })

        describe("When principal has one of the required permissions", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["delete:users"])
          })

          it("should return true", () => {
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })

        describe("When principal has none of the required permissions", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["read:users"])
          })

          it("should throw PermissionDeniedException", () => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(PermissionDeniedException, {
              permission: "admin | delete:users",
            })
          })
        })
      })

      describe("Given both @RequiresPermission and @RequiresAnyPermission metadata", () => {
        beforeEach(() => {
          jest
            .spyOn(reflector, "getAllAndOverride")
            .mockImplementation((key: string) => {
              if (key === REQUIRED_PERMISSIONS_KEY) {
                return ["read:users"]
              }
              if (key === REQUIRED_ANY_PERMISSIONS_KEY) {
                return ["admin", "write:users"]
              }
              return undefined
            })
        })

        describe("When principal satisfies both requirements", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["read:users", "write:users"])
          })

          it("should return true", () => {
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })

        describe("When principal satisfies AND but not OR", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["read:users"])
          })

          it("should throw PermissionDeniedException for OR requirement", () => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(PermissionDeniedException, {
              permission: "admin | write:users",
            })
          })
        })

        describe("When principal satisfies OR but not AND", () => {
          beforeEach(() => {
            request.principal = createPrincipal(["admin"])
          })

          it("should throw PermissionDeniedException for AND requirement", () => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(PermissionDeniedException, {
              permission: "read:users",
            })
          })
        })
      })
    })
  })
})

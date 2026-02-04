import { faker } from "@faker-js/faker"
import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { Request } from "express"
import { express } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"

import { Authenticated } from "./authenticated.guard"

describe("Authenticated", () => {
  let guard: Authenticated

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Authenticated],
    }).compile()

    guard = module.get(Authenticated)
  })

  describe("canActivate", () => {
    let request: Partial<Request>
    let ctx: Partial<ExecutionContext>
    beforeEach(() => {
      request = express.request()
      ctx = executionContext(request, express.response())
    })

    describe(`When it is called with a request with no current Account`, () => {
      it("Then it should throw an UnauthorizedException.", () => {
        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          UnauthorizedException,
          {
            message:
              "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
          },
        )
      })
    })

    describe(`When it is called with a request with an attached principal`, () => {
      beforeEach(() => {
        request.principal = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        }
      })

      it("Then it should return true.", () => {
        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })
  })
})

import { faker } from "@faker-js/faker"
import {
  ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { Request } from "express"
import { express } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"

import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"

import { Authenticated } from "./authenticated.guard"

describe("Authenticated", () => {
  describe("Without a redirect URL", () => {
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
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(UnauthorizedException, {
            message:
              "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
          })
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

  describe("With a redirect URL", () => {
    const redirectUrl = "/auth/magic-link"
    let guard: Authenticated

    beforeAll(() => {
      guard = new Authenticated(redirectUrl)
    })

    describe("canActivate", () => {
      let request: Partial<Request>
      let ctx: Partial<ExecutionContext>
      beforeEach(() => {
        request = express.request()
        ctx = executionContext(request, express.response())
      })

      describe(`When it is called with a request with no current Account`, () => {
        it("Then it should throw an UnauthorizedRedirectException.", () => {
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(UnauthorizedRedirectException, {
            message: "Unauthorized. Redirecting to login.",
          })
        })

        it("Then the exception should have a redirect with the URL and 303 status.", () => {
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(UnauthorizedRedirectException, {
            url: redirectUrl,
            redirectStatus: HttpStatus.SEE_OTHER,
          })
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
})

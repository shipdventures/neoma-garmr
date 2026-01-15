import { faker } from "@faker-js/faker/."
import { AuthenticationService } from "@lib/services/authentication.service"
import { LoggerService } from "@nestjs/common"
import { TestingModule, Test } from "@nestjs/testing"
import { Request, Response } from "express"
import { express } from "fixtures/fakes/express"
import * as jwt from "jsonwebtoken"
import { v4 } from "uuid"

import { AuthenticationMiddleware } from "./authentication.middleware"

describe("AuthenticationMiddleware", () => {
  let service: any
  let middleware: AuthenticationMiddleware
  beforeEach(async () => {
    service = { authenticate: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
      ],
    }).compile()

    middleware = module.get(AuthenticationMiddleware)
  })

  it("it should assign the result of service.authenticate to req.principal", (done) => {
    const id = v4()
    const bearer = `Bearer ${jwt.sign({ sub: id }, v4())}`
    const principal = { id, email: faker.internet.email() }
    service.authenticate.mockResolvedValue(principal)

    const req = express.request({
      headers: {
        authorization: bearer,
      },
    }) as Request

    void middleware.use(req, express.response() as Response, () => {
      expect(service.authenticate).toHaveBeenCalledWith(bearer)
      expect(req.principal).toBe(principal)
      done()
    })
  })

  describe("When service.authenticate throws (for any reason including expected authentication failures)", () => {
    const bearer = `Bearer ${jwt.sign({ sub: v4() }, v4())}`
    const error = new Error(faker.hacker.phrase())
    beforeEach(() => {
      jest.clearAllMocks()
      service.authenticate.mockRejectedValue(error)
    })

    it("it should just call next", (done) => {
      const req = express.request({
        headers: {
          authorization: bearer,
        },
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(service.authenticate).toHaveBeenCalledWith(bearer)
        expect(req.principal).toBeUndefined()
        done()
      })
    })

    it("it should log a warning if req.logger is a LoggerService", (done) => {
      const logger = { warn: jest.fn() }
      const req = express.request({
        headers: {
          authorization: bearer,
        },
        logger: logger as unknown as LoggerService,
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(logger.warn).toHaveBeenCalledWith(
          "Authentication via authorization header failed",
          {
            err: error,
          },
        )
        done()
      })
    })
  })
})

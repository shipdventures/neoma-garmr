import { faker } from "@faker-js/faker"
import { LoggerService } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { Request, Response } from "express"
import { express } from "fixtures/fakes/express"
import * as jwt from "jsonwebtoken"
import { v4 } from "uuid"

import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { AuthenticationService } from "../services/authentication.service"

import { BearerAuthenticationMiddleware } from "./bearer-authentication.middleware"

const BEARER_SCHEMES = ["Bearer", "bearer", "BEARER"]
const BASIC_SCHEMES = ["Basic", "basic", "BASIC"]
const MALFORMED_BEARER_TOKENS = [
  {
    header: "Bearer",
    desc: "no token",
    err: "Invalid authentication header format",
  },
  {
    header: "Bearer ",
    desc: "no token (trailing space)",
    err: "Invalid authentication header format",
  },
  {
    header: "Bearer      ",
    desc: "no token (multiple spaces)",
    err: "Invalid authentication header format",
  },
  {
    header: "   ",
    desc: "whitespace only",
    err: `Invalid authentication scheme. Expected Bearer but got ""`,
  },
]

describe("BearerAuthenticationMiddleware", () => {
  let service: any
  let middleware: BearerAuthenticationMiddleware
  beforeEach(async () => {
    service = { authenticate: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BearerAuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
      ],
    }).compile()

    middleware = module.get(BearerAuthenticationMiddleware)
  })

  describe("When req.principal is already set", () => {
    it("it should skip authentication and call next", (done) => {
      const existingPrincipal = { id: v4(), email: faker.internet.email(), password: "hashed" }
      const req = express.request({
        headers: {
          authorization: `Bearer ${jwt.sign({ sub: v4() }, v4())}`,
        },
        principal: existingPrincipal,
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(service.authenticate).not.toHaveBeenCalled()
        expect(req.principal).toBe(existingPrincipal)
        done()
      })
    })
  })

  BEARER_SCHEMES.forEach((bearer) => {
    describe(`When it's called with a signed ${bearer} token representing the id of an existing registration`, () => {
      it("it should use it to authenticate and assign the result to req.principal", (done) => {
        const id = v4()
        const token = jwt.sign({ sub: id }, v4())
        const bearer = `Bearer ${token}`
        const principal = { id, email: faker.internet.email() }
        service.authenticate.mockResolvedValue(principal)

        const req = express.request({
          headers: {
            authorization: bearer,
          },
        }) as Request

        void middleware.use(req, express.response() as Response, () => {
          expect(service.authenticate).toHaveBeenCalledWith(token)
          expect(req.principal).toBe(principal)
          done()
        })
      })
    })
  })

  describe("When it's called without a Bearer token", () => {
    it("it should just call next", (done) => {
      void middleware.use(
        express.request() as Request,
        express.response() as Response,
        done,
      )
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

  MALFORMED_BEARER_TOKENS.forEach(({ header, desc, err }) => {
    describe(`When called with ${desc}: "${header}"`, () => {
      it("it should throw an InvalidCredentialsException", async () => {
        const req = express.request({
          headers: {
            authorization: header,
          },
        }) as Request

        await expect(
          middleware.use(req, express.response() as Response, () => {}),
        ).rejects.toMatchError(InvalidCredentialsException, { message: err })
      })
    })
  })

  BASIC_SCHEMES.forEach((basic) => {
    describe(`When it's called with a ${basic} token`, () => {
      it("it should throw an InvalidCredentialsException", async () => {
        const req = express.request({
          headers: {
            authorization: `${basic} ${jwt.sign({ sub: v4() }, v4())}`,
          },
        }) as Request

        await expect(
          middleware.use(req, express.response() as Response, () => {}),
        ).rejects.toMatchError(InvalidCredentialsException, {
          message: `Invalid authentication scheme. Expected Bearer but got "${basic}"`,
        })
      })
    })
  })
})

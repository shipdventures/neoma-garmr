import { faker } from "@faker-js/faker"
import { LoggerService } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { Request, Response } from "express"
import { express } from "fixtures/fakes/express"
import * as jwt from "jsonwebtoken"
import { v4 } from "uuid"

import { AuthenticationService } from "../services/authentication.service"

import { CookieAuthenticationMiddleware } from "./cookie-authentication.middleware"

describe("CookieAuthenticationMiddleware", () => {
  let service: any
  let middleware: CookieAuthenticationMiddleware
  beforeEach(async () => {
    service = { authenticate: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieAuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
      ],
    }).compile()

    middleware = module.get(CookieAuthenticationMiddleware)
  })

  describe("When req.principal is already set", () => {
    it("it should skip authentication and call next", (done) => {
      const existingPrincipal = { id: v4(), email: faker.internet.email(), password: "hashed" }
      const sid = jwt.sign({ sub: v4() }, v4())
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
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

  describe("When it's called with a garmr.sid cookie", () => {
    it("it should use it to authenticate and assign the result to req.principal", (done) => {
      const id = v4()
      const sid = jwt.sign({ sub: id }, v4())
      const principal = { id, email: faker.internet.email(), password: "hashed" }
      service.authenticate.mockResolvedValue(principal)

      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(service.authenticate).toHaveBeenCalledWith(sid)
        expect(req.principal).toBe(principal)
        done()
      })
    })
  })

  describe("When it's called without a cookie header", () => {
    it("it should just call next", (done) => {
      void middleware.use(
        express.request() as Request,
        express.response() as Response,
        done,
      )
    })
  })

  describe("When it's called with cookies but no garmr.sid", () => {
    it("it should just call next", (done) => {
      const req = express.request({
        headers: {
          cookie: "other=value; another=thing",
        },
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(service.authenticate).not.toHaveBeenCalled()
        expect(req.principal).toBeUndefined()
        done()
      })
    })
  })

  describe("When service.authenticate throws", () => {
    const sid = jwt.sign({ sub: v4() }, v4())
    const error = new Error(faker.hacker.phrase())
    beforeEach(() => {
      jest.clearAllMocks()
      service.authenticate.mockRejectedValue(error)
    })

    it("it should just call next", (done) => {
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(req.principal).toBeUndefined()
        done()
      })
    })

    it("it should log a warning if req.logger is present", (done) => {
      const logger = { warn: jest.fn() }
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
        logger: logger as unknown as LoggerService,
      }) as Request

      void middleware.use(req, express.response() as Response, () => {
        expect(logger.warn).toHaveBeenCalledWith(
          "Authentication via cookie failed",
          {
            err: error,
          },
        )
        done()
      })
    })
  })
})

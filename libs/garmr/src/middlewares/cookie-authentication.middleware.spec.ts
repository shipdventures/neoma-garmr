import { faker } from "@faker-js/faker"
import { AuthenticationService } from "@lib/services/authentication.service"
import { LoggerService } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { Request, Response } from "express"
import { express } from "fixtures/fakes/express"
import * as jwt from "jsonwebtoken"
import { v4 } from "uuid"

import { GARMR_OPTIONS } from "../garmr.options"

import { CookieAuthenticationMiddleware } from "./cookie-authentication.middleware"

describe("CookieAuthenticationMiddleware", () => {
  let service: any
  let middleware: CookieAuthenticationMiddleware

  const buildModule = async (cookieOptions?: {
    name?: string
  }): Promise<void> => {
    service = { authenticate: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieAuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
        {
          provide: GARMR_OPTIONS,
          useValue: { cookie: cookieOptions },
        },
      ],
    }).compile()

    middleware = module.get(CookieAuthenticationMiddleware)
  }

  beforeEach(async () => {
    await buildModule()
  })

  describe("When req.principal is already set", () => {
    it("should skip authentication and call next", (done) => {
      const existingPrincipal = { id: v4(), email: faker.internet.email() }
      const sid = jwt.sign({ sub: v4() }, v4())
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
        principal: existingPrincipal,
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).not.toHaveBeenCalled()
          expect(req.principal).toBe(existingPrincipal)
          done()
        },
      )
    })
  })

  describe("When called with a garmr.sid cookie", () => {
    it("should use it to authenticate and assign the result to req.principal", (done) => {
      const id = v4()
      const sid = jwt.sign({ sub: id }, v4())
      const principal = { id, email: faker.internet.email() }
      service.authenticate.mockResolvedValue(principal)

      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).toHaveBeenCalledWith(sid)
          expect(req.principal).toBe(principal)
          done()
        },
      )
    })
  })

  describe("When called without a cookie header", () => {
    it("should call next without calling service", (done) => {
      const req = express.request()

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).not.toHaveBeenCalled()
          expect(req.principal).toBeUndefined()
          done()
        },
      )
    })
  })

  describe("When called with cookies but no garmr.sid", () => {
    it("should call next without calling service", (done) => {
      const req = express.request({
        headers: {
          cookie: "other=value; another=thing",
        },
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).not.toHaveBeenCalled()
          expect(req.principal).toBeUndefined()
          done()
        },
      )
    })
  })

  describe("When service.authenticate throws", () => {
    const sid = jwt.sign({ sub: v4() }, v4())
    const error = new Error(faker.hacker.phrase())
    beforeEach(() => {
      jest.clearAllMocks()
      service.authenticate.mockRejectedValue(error)
    })

    it("should call next without setting principal", (done) => {
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(req.principal).toBeUndefined()
          done()
        },
      )
    })

    it("should log a warning if req.logger is present", (done) => {
      const logger = { warn: jest.fn() }
      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
        logger: logger as unknown as LoggerService,
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(logger.warn).toHaveBeenCalledWith(
            "Authentication via cookie failed",
            {
              err: error,
            },
          )
          done()
        },
      )
    })
  })

  describe("When configured with a custom cookie name", () => {
    beforeEach(async () => {
      await buildModule({ name: "my-app.sid" })
    })

    it("should use the custom cookie name", (done) => {
      const id = v4()
      const sid = jwt.sign({ sub: id }, v4())
      const principal = { id, email: faker.internet.email() }
      service.authenticate.mockResolvedValue(principal)

      const req = express.request({
        headers: {
          cookie: "my-app.sid=" + encodeURIComponent(sid),
        },
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).toHaveBeenCalledWith(sid)
          expect(req.principal).toBe(principal)
          done()
        },
      )
    })

    it("should not match the default garmr.sid cookie", (done) => {
      const sid = jwt.sign({ sub: v4() }, v4())

      const req = express.request({
        headers: {
          cookie: "garmr.sid=" + encodeURIComponent(sid),
        },
      })

      void middleware.use(
        req as unknown as Request,
        express.response() as unknown as Response,
        () => {
          expect(service.authenticate).not.toHaveBeenCalled()
          expect(req.principal).toBeUndefined()
          done()
        },
      )
    })
  })
})

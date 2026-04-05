import { faker } from "@faker-js/faker"
import { GarmrModule } from "@lib/garmr.module"
import { Authenticatable } from "@lib/interfaces/authenticatable.interface"
import { DynamicModule } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as cookie from "cookie"
import { Response } from "express"
import { express } from "fixtures/fakes/express"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
import { v4 } from "uuid"

import { GarmrOptions, MailerOptions } from "../garmr.options"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { SessionService } from "./session.service"

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: any

  @Column({ unique: true })
  public email!: string
}

const registrations: [string, (opts: GarmrOptions<User>) => DynamicModule][] = [
  ["forRoot", (opts): DynamicModule => GarmrModule.forRoot(opts)],
  [
    "forRootAsync",
    (opts): DynamicModule =>
      GarmrModule.forRootAsync({ useFactory: (): GarmrOptions<User> => opts }),
  ],
]

registrations.forEach(([name, register]) => {
  describe(`SessionService (${name})`, () => {
    const secret = faker.string.alphanumeric(32)
    const expiresIn = "1h"

    const buildModule = async (cookieOptions?: {
      name?: string
      domain?: string
      secure?: boolean
      sameSite?: "strict" | "lax" | "none"
      path?: string
    }): Promise<SessionService> => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          register({
            secret,
            expiresIn,
            entity: User,
            mailer: {} as MailerOptions,
            cookie: cookieOptions,
          }),
        ],
      }).compile()

      return module.get<SessionService>(SessionService)
    }

    describe("create", () => {
      let service: SessionService
      const entity = { id: v4(), email: faker.internet.email() }

      beforeEach(async () => {
        service = await buildModule()
      })

      it("should issue a token with sub and session audience", () => {
        const res = express.response() as unknown as Response
        const result = service.create(res, entity as Authenticatable)

        const payload = jwt.verify(result.token, secret) as jwt.JwtPayload
        expect(payload.sub).toBe(entity.id)
        expect(payload.aud).toBe(SESSION_AUDIENCE)
      })

      it("should return the token and decoded payload", () => {
        const res = express.response() as unknown as Response
        const result = service.create(res, entity as Authenticatable)

        expect(result.token).toBeDefined()
        expect(result.payload).toBeDefined()
        expect(result.payload.sub).toBe(entity.id)
        expect(result.payload.aud).toBe(SESSION_AUDIENCE)
      })

      it("should set a Set-Cookie header with garmr.sid by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        const parsed = cookie.parse(res.get("set-cookie")!)
        expect(parsed["garmr.sid"]).toBeDefined()
      })

      it("should append to existing Set-Cookie headers rather than overwrite", () => {
        const res = express.response() as unknown as Response
        res.setHeader("Set-Cookie", "existing=value")
        service.create(res, entity as Authenticatable)

        const header = res.getHeader("set-cookie") as string[]
        expect(header).toHaveLength(2)
        expect(header[0]).toBe("existing=value")
        expect(header[1]).toContain("garmr.sid=")
      })

      it("should set httpOnly=true", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("httponly")
      })

      it("should set Secure by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("secure")
      })

      it("should set SameSite=Lax by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("samesite=lax")
      })

      it("should set Path=/ by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        expect(res.get("set-cookie")!).toContain("Path=/")
      })

      it("should set Max-Age matching the JWT expiry", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity as Authenticatable)

        // expiresIn is "1h" = 3600 seconds
        expect(res.get("set-cookie")!).toContain("Max-Age=3600")
      })

      describe("with custom cookie options", () => {
        beforeEach(async () => {
          service = await buildModule({
            name: "my-app.sid",
            domain: "example.com",
            secure: false,
            sameSite: "strict",
            path: "/api",
          })
        })

        it("should use the custom cookie name", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity as Authenticatable)

          const parsed = cookie.parse(res.get("set-cookie")!)
          expect(parsed["my-app.sid"]).toBeDefined()
          expect(parsed["garmr.sid"]).toBeUndefined()
        })

        it("should use the custom domain", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity as Authenticatable)

          expect(res.get("set-cookie")!).toContain("Domain=example.com")
        })

        it("should use custom SameSite", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity as Authenticatable)

          expect(res.get("set-cookie")!.toLowerCase()).toContain(
            "samesite=strict",
          )
        })

        it("should use custom path", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity as Authenticatable)

          expect(res.get("set-cookie")!).toContain("Path=/api")
        })

        it("should not include Secure when secure=false", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity as Authenticatable)

          expect(res.get("set-cookie")!.toLowerCase()).not.toContain("secure")
        })
      })
    })

    describe("cookie configuration validation", () => {
      it("should throw when sameSite=none and secure=false", async () => {
        await expect(
          buildModule({ sameSite: "none", secure: false }),
        ).rejects.toThrow(
          'Garmr cookie misconfiguration: sameSite="none" requires secure=true',
        )
      })

      it("should allow sameSite=none when secure=true", async () => {
        const service = await buildModule({ sameSite: "none", secure: true })
        expect(service).toBeDefined()
      })
    })

    describe("clear", () => {
      let service: SessionService

      beforeEach(async () => {
        service = await buildModule()
      })

      it("should set a cookie with Max-Age=0", () => {
        const res = express.response() as unknown as Response
        service.clear(res)

        expect(res.get("set-cookie")!).toContain("Max-Age=0")
      })

      it("should set the cookie name to garmr.sid", () => {
        const res = express.response() as unknown as Response
        service.clear(res)

        const parsed = cookie.parse(res.get("set-cookie")!)
        expect(parsed["garmr.sid"]).toBeDefined()
      })
    })
  })
})

import { faker } from "@faker-js/faker"
import { TokenFailedVerificationException } from "@lib/exceptions/token-failed-verification.exception"
import { TokenMalformedException } from "@lib/exceptions/token-malformed.exception"
import { GarmrModule } from "@lib/garmr.module"
import { Authenticatable } from "@lib/interfaces/authenticatable.interface"
import { DynamicModule } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { GarmrOptions, MailerOptions } from "../garmr.options"

import { TokenService } from "./token.service"

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
  describe(`TokenService (${name})`, () => {
    const secret = faker.internet.password()
    const expiresIn = "1h"
    let service: TokenService

    beforeEach(async () => {
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
          }),
        ],
      }).compile()

      service = module.get<TokenService>(TokenService)
    })

    describe("issue", () => {
      it("should create a signed JWT with the given payload", () => {
        const key = faker.lorem.word()
        const value = faker.lorem.word()
        const { token } = service.issue({ [key]: value })

        const decoded = jwt.verify(token, secret) as jwt.JwtPayload
        expect(decoded[key]).toBe(value)
      })

      it("should include iat, nbf, and exp in the payload", () => {
        const { token } = service.issue({ foo: "bar" })
        const payload = jwt.decode(token) as jwt.JwtPayload

        const now = Math.floor(Date.now() / 1000)

        expect(payload).toMatchObject({
          iat: expect.toBeWithin(now - 1, now + 2),
          nbf: payload.iat!,
          exp: payload.iat! + 3600,
        })
      })

      it("should sign tokens with HS256 algorithm", () => {
        const { token } = service.issue({ foo: "bar" })
        const header = JSON.parse(
          Buffer.from(token.split(".")[0], "base64url").toString(),
        )

        expect(header.alg).toBe("HS256")
      })

      it("should allow overriding expiresIn", () => {
        const { token } = service.issue({ foo: "bar" }, { expiresIn: "15m" })
        const payload = jwt.decode(token) as jwt.JwtPayload

        expect(payload.exp).toBe(payload.iat! + 900)
      })
    })

    describe("verify", () => {
      it("should return the verified payload", () => {
        const key = faker.lorem.word()
        const value = faker.lorem.word()
        const { token } = service.issue({ [key]: value })

        const payload = service.verify(token)

        expect(payload[key]).toBe(value)
      })

      it("should throw TokenFailedVerificationException for a token with wrong signature", () => {
        const token = jwt.sign({ sub: "test" }, "wrong-secret")

        expect(() => service.verify(token)).toThrowMatching(
          TokenFailedVerificationException,
          { reason: "invalid" },
        )
      })

      it("should throw TokenFailedVerificationException for an expired token", () => {
        const token = jwt.sign({ sub: "test" }, secret, { expiresIn: -1 })

        expect(() => service.verify(token)).toThrowMatching(
          TokenFailedVerificationException,
          { reason: "expired" },
        )
      })

      it("should throw TokenFailedVerificationException for a token signed with alg=none", () => {
        const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
          "base64url",
        )
        const payload = Buffer.from('{"sub":"test"}').toString("base64url")
        const token = `${header}.${payload}.`

        expect(() => service.verify(token)).toThrowMatching(
          TokenFailedVerificationException,
          { reason: "invalid" },
        )
      })

      it("should throw TokenFailedVerificationException for a token signed with HS384", () => {
        const token = jwt.sign({ sub: "test" }, secret, { algorithm: "HS384" })

        expect(() => service.verify(token)).toThrowMatching(
          TokenFailedVerificationException,
          { reason: "invalid" },
        )
      })
    })

    describe("decode", () => {
      it("should return the payload without verifying signature", () => {
        const key = faker.lorem.word()
        const value = faker.lorem.word()
        const { token } = service.issue({ [key]: value })

        const payload = service.decode(token)

        expect(payload[key]).toBe(value)
      })

      it("should throw TokenMalformedException for a malformed token", () => {
        expect(() => service.decode("not-a-valid-token")).toThrow(
          TokenMalformedException,
        )
      })
    })
  })
})

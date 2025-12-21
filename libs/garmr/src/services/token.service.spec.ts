import { Test, TestingModule } from "@nestjs/testing"
import { TokenService } from "./token.service"
import { faker } from "@faker-js/faker/."
import * as jwt from "jsonwebtoken"
import { GarmrModule } from "@lib/garmr.module"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TokenFailedVerificationException } from "@lib/exceptions/token-failed-verification.exception"
import { TokenMalformedException } from "@lib/exceptions/token-malformed.exception"
import { Authenticatable } from "@lib/interfaces/authenticatable.interface"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: any

  @Column({ unique: true })
  public email: string

  @Column()
  public password: string
}

describe("TokenService", () => {
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
        GarmrModule.forRoot({ secret, expiresIn, entity: User }),
      ],
    }).compile()

    service = module.get<TokenService>(TokenService)
  })

  describe("issue", () => {
    it("should create a signed JWT", () => {
      const authenticated = { id: faker.string.uuid() }
      const token = service.issue(authenticated)

      expect(() => jwt.verify(token, secret)).not.toThrow()
    })

    it("should include sub, iat, and exp in the payload", () => {
      const authenticated = { id: faker.string.uuid() }
      const token = service.issue(authenticated)
      const payload = jwt.decode(token) as jwt.JwtPayload

      const now = Math.floor(Date.now() / 1000)

      expect(payload).toMatchObject({
        sub: authenticated.id,
        iat: expect.toBeWithin(now - 1, now + 2),
        exp: payload.iat! + 3600,
      })
    })
  })

  describe("verify", () => {
    it("should return the payload for a valid token", () => {
      const authenticated = { id: faker.string.uuid() }
      const token = service.issue(authenticated)

      const payload = service.verify(token)

      expect(payload).toEqual(authenticated)
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
  })

  describe("decode", () => {
    it("should return the payload without verifying signature", () => {
      const authenticated = { id: faker.string.uuid() }
      const token = service.issue(authenticated)

      const payload = service.decode(token)

      expect(payload).toEqual(authenticated)
    })

    it("should throw TokenMalformedException for a malformed token", () => {
      expect(() => service.decode("not-a-valid-token")).toThrow(
        TokenMalformedException,
      )
    })
  })
})

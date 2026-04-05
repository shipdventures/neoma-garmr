import { faker } from "@faker-js/faker"
import { Authenticatable, GarmrAuthenticatedEvent, GarmrModule } from "@lib"
import { IncorrectCredentialsException } from "@lib/exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "@lib/exceptions/invalid-credentials.exception"
import { DynamicModule } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm"
import { v4 } from "uuid"

import { GarmrOptions, MailerOptions } from "../garmr.options"

import { AuthenticationService } from "./authentication.service"
import { SESSION_AUDIENCE } from "./magic-link.service"

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
  describe(`AuthenticationService (${name})`, () => {
    let service: AuthenticationService
    let repository: Repository<User>
    let eventEmitter: EventEmitter2

    const email = faker.internet.email()
    const secret = faker.string.alphanumeric(32)
    const expiresIn = faker.helpers.arrayElement(["1h", "1d", 7200])

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          TypeOrmModule.forFeature([User]),
          register({
            secret,
            expiresIn,
            entity: User,
            mailer: {} as MailerOptions,
          }),
        ],
      }).compile()

      service = module.get<AuthenticationService>(AuthenticationService)
      repository = module.get<Repository<User>>(getRepositoryToken(User))
      eventEmitter = module.get<EventEmitter2>(EventEmitter2)
    })

    describe("authenticate", () => {
      let user: User
      let emitSpy: jest.SpyInstance

      beforeEach(async () => {
        user = repository.create({ email: email.toLowerCase() })
        await repository.save(user)
        emitSpy = jest.spyOn(eventEmitter, "emit")
      })

      describe("When called with a valid session token for an existing user", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, {
            expiresIn,
          })
        })

        it("should return the user entity", async () => {
          const result = await service.authenticate<User>(token)
          expect(result).toEqual(user)
        })

        it("should emit a 'garmr.authenticated' event", async () => {
          const result = await service.authenticate(token)

          expect(emitSpy).toHaveBeenCalledWith(
            GarmrAuthenticatedEvent.EVENT_NAME,
            new GarmrAuthenticatedEvent(result),
          )
        })
      })

      describe("When called with a token for a non-existing user", () => {
        const id = v4()
        const token = jwt.sign({ sub: id, aud: SESSION_AUDIENCE }, secret, {
          expiresIn,
        })

        it("should throw an IncorrectCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            IncorrectCredentialsException,
            { identifier: id },
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            IncorrectCredentialsException,
            { identifier: id },
          )
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a token without a sub claim", () => {
        const token = jwt.sign({ aud: SESSION_AUDIENCE }, secret, { expiresIn })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            InvalidCredentialsException,
            { message: "Invalid JWT payload: missing sub claim" },
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a token with the wrong audience", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: "magic-link" }, secret, {
            expiresIn,
          })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            InvalidCredentialsException,
            { message: "Invalid JWT: wrong audience" },
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a token with a missing aud claim", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id }, secret, { expiresIn })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            InvalidCredentialsException,
            { message: "Invalid JWT: wrong audience" },
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a token with a future not before date", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, {
            notBefore: "1d",
            expiresIn,
          })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toThrow(
            InvalidCredentialsException,
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with an expired token", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, {
            expiresIn: -10,
          })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toThrow(
            InvalidCredentialsException,
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with an incorrectly signed token", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, v4(), {
            expiresIn,
          })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toThrow(
            InvalidCredentialsException,
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a JWT with alg=none", () => {
        let token: string
        beforeEach(() => {
          const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
            "base64url",
          )
          const payload = Buffer.from(
            `{"sub":"${user.id}","aud":"${SESSION_AUDIENCE}"}`,
          ).toString("base64url")
          token = `${header}.${payload}.`
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toThrow(
            InvalidCredentialsException,
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with a JWT signed with HS384 (non-whitelisted algorithm)", () => {
        let token: string
        beforeEach(() => {
          token = jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, {
            algorithm: "HS384",
            expiresIn,
          })
        })

        it("should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toThrow(
            InvalidCredentialsException,
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(token)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })

      describe("When called with null or undefined", () => {
        it("should throw an InvalidCredentialsException for undefined", async () => {
          await expect(
            service.authenticate(undefined as unknown as string),
          ).rejects.toMatchError(InvalidCredentialsException, {
            message: "token cannot be null or undefined",
          })
        })

        it("should throw an InvalidCredentialsException for null", async () => {
          await expect(
            service.authenticate(null as unknown as string),
          ).rejects.toMatchError(InvalidCredentialsException, {
            message: "token cannot be null or undefined",
          })
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(
            service.authenticate(undefined as unknown as string),
          ).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })
    })
  })
})

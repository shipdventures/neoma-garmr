import { faker } from "@faker-js/faker"
import { Authenticatable, GarmrAuthenticatedEvent, GarmrModule } from "@lib"
import { IncorrectCredentialsException } from "@lib/exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "@lib/exceptions/invalid-credentials.exception"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm"
import { v4 } from "uuid"

import { MailerOptions } from "../garmr.options"

import { AuthenticationService } from "./authentication.service"
import { SESSION_AUDIENCE } from "./magic-link.service"

const BEARER_SCHEMES = ["Bearer", "bearer", "BEARER"]
const BASIC_SCHEMES = ["Basic", "basic", "BASIC"]
const MALFORMED_BEARER_TOKENS = [
  {
    header: "",
    desc: "an empty string",
    err: `Invalid authentication token scheme. Expected Bearer but got ""`,
  },
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
    err: `Invalid authentication token scheme. Expected Bearer but got ""`,
  },
  {
    header: "Bearer notajwt",
    desc: "malformed JWT",
    err: "Invalid JWT: Invalid JWT signature",
  },
  {
    header: "Bearer abc.def",
    desc: "incomplete JWT",
    err: "Invalid JWT: Invalid JWT signature",
  },
]

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: any

  @Column({ unique: true })
  public email: string
}

describe("AuthenticationService", () => {
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
        GarmrModule.forRoot({
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

  describe("authenticate with Bearer token", () => {
    let user: User
    let emitSpy: jest.SpyInstance

    beforeEach(async () => {
      user = repository.create({ email: email.toLowerCase() })
      await repository.save(user)
      emitSpy = jest.spyOn(eventEmitter, "emit")
    })

    BEARER_SCHEMES.forEach((bearer) => {
      describe(`When it's called with a signed ${bearer} token representing the id of an existing user`, () => {
        let token: string
        beforeEach(() => {
          token = `${bearer} ${jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, { expiresIn })}`
        })

        it("it should return the user entity", async () => {
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

      describe(`When it's called with a signed ${bearer} token representing the id of an existing user (with extra spaces)`, () => {
        let token: string
        beforeEach(() => {
          token = `${bearer}          ${jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, secret, { expiresIn })}`
        })

        it("it should return the user entity", async () => {
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
    })

    describe("When it's called with a signed Bearer token representing the id of a non-existing user", () => {
      const id = v4()
      const token = `Bearer ${jwt.sign({ sub: id, aud: SESSION_AUDIENCE }, secret, { expiresIn })}`

      it("it should throw an IncorrectCredentialsException", async () => {
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

    describe("When it's called with a signed Bearer token without a sub claim", () => {
      const token = `Bearer ${jwt.sign({ aud: SESSION_AUDIENCE }, secret, { expiresIn })}`

      it("it should throw an InvalidCredentialsException", async () => {
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

    describe("When it's called with a Bearer token with the wrong audience", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: user.id, aud: "magic-link" }, secret, { expiresIn })}`
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

    describe("When it's called with a Bearer token with a missing aud claim", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: user.id }, secret, { expiresIn })}`
      })

      it("should throw InvalidCredentialsException when aud is missing", async () => {
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

    describe("When it's called with a Bearer token with a future not before date", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign(
          { sub: user.id, aud: SESSION_AUDIENCE },
          secret,
          {
            notBefore: "1d",
            expiresIn,
          },
        )}`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Not active yet (nbf claim)" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an expired Bearer token", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign(
          { sub: user.id, aud: SESSION_AUDIENCE },
          secret,
          {
            expiresIn: -10,
          },
        )}`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Token expired" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an incorrectly signed Bearer token", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: user.id, aud: SESSION_AUDIENCE }, v4(), { expiresIn })}`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Invalid JWT signature" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called without a Bearer token", () => {
      it("it should throw an InvalidCredentialsException", async () => {
        await expect(
          service.authenticate(undefined as unknown as string),
        ).rejects.toMatchError(InvalidCredentialsException, {
          message:
            "Invalid authentication argument. Expected Bearer but got null or undefined",
        })
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        await expect(service.authenticate("")).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When called with a JWT without a signature and alg=none", () => {
      let token: string
      beforeEach(() => {
        // Manually craft a token with alg: none
        const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
          "base64url",
        )
        const payload = Buffer.from(
          `{"sub":"${user.id}","aud":"${SESSION_AUDIENCE}"}`,
        ).toString("base64url")
        token = `Bearer ${header}.${payload}.`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Invalid JWT signature" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    MALFORMED_BEARER_TOKENS.forEach(({ header, desc, err }) => {
      describe(`When called with ${desc}: "${header}"`, () => {
        it("it should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(header)).rejects.toMatchError(
            InvalidCredentialsException,
            { message: err },
          )
        })

        it("should not emit a 'garmr.authenticated' event", async () => {
          await expect(service.authenticate(header)).rejects.toThrow()
          expect(emitSpy).not.toHaveBeenCalled()
        })
      })
    })

    BASIC_SCHEMES.forEach((basic) => {
      describe(`When it's called with a ${basic} token`, () => {
        const token = `${basic} ${jwt.sign({ sub: v4() }, secret, { expiresIn })}`

        it("it should throw an InvalidCredentialsException", async () => {
          await expect(service.authenticate(token)).rejects.toMatchError(
            InvalidCredentialsException,
            {
              message: `Invalid authentication token scheme. Expected Bearer but got "${basic}"`,
            },
          )
        })
      })
    })
  })
})

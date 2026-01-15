import { faker } from "@faker-js/faker"
import {
  Authenticatable,
  GarmrAuthenticatedEvent,
  GarmrModule,
  RegistrationService,
} from "@lib"
import { IncorrectCredentialsException } from "@lib/exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "@lib/exceptions/invalid-credentials.exception"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
import { v4 } from "uuid"

import { AuthenticationService } from "./authentication.service"

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
class Registration implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: any

  @Column({ unique: true })
  public email: string

  @Column()
  public password: string
}

describe("AuthenticationService", () => {
  let service: AuthenticationService
  let registrationService: RegistrationService
  let eventEmitter: EventEmitter2

  const email = faker.internet.email()
  const password = faker.internet.password()
  const secret = faker.string.alphanumeric(32)
  const expiresIn = faker.helpers.arrayElement(["1h", "1d", 7200])

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Registration],
          synchronize: true,
        }),
        GarmrModule.forRoot({
          secret,
          expiresIn,
          entity: Registration,
        }),
      ],
    }).compile()

    service = module.get<AuthenticationService>(AuthenticationService)
    registrationService = module.get<RegistrationService>(RegistrationService)
    eventEmitter = module.get<EventEmitter2>(EventEmitter2)
  })

  describe("authenticate with email and password", () => {
    describe(`Given the email ${email} and password ${password} have already been registered`, () => {
      let registration: Registration
      beforeEach(async () => {
        registration = await registrationService.register({ email, password })
      })

      it(`should return the registered entity when called with the email ${email} and ${password}`, async () => {
        const user = await service.authenticate({ email, password })
        expect(user).toEqual(registration)
      })

      it(`should return the registered entity when called with the email ${email.toUpperCase()} and ${password}`, async () => {
        const user = await service.authenticate({
          email: email.toUpperCase(),
          password,
        })
        expect(user).toEqual(registration)
      })

      it("should emit a 'garmr.authenticated' event when it successfully authenticates some credentials", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        const user = await service.authenticate({ email, password })

        expect(emitSpy).toHaveBeenCalledWith(
          GarmrAuthenticatedEvent.EVENT_NAME,
          new GarmrAuthenticatedEvent(user),
        )
      })

      it("should throw IncorrectCredentialsException when called with an incorrect password", async () => {
        await expect(
          service.authenticate({ email, password: faker.internet.password() }),
        ).rejects.toMatchError(IncorrectCredentialsException, {
          identifier: email,
        })
      })

      it("should not emit a 'garmr.authenticated' event when password is wrong", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await expect(
          service.authenticate({ email, password: faker.internet.password() }),
        ).rejects.toMatchError(IncorrectCredentialsException, {
          identifier: email,
        })

        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("Given no user exists with that email", () => {
      const email = faker.internet.email()

      it("should throw IncorrectCredentialsException", async () => {
        await expect(
          service.authenticate({ email, password }),
        ).rejects.toThrowMatching(IncorrectCredentialsException, {
          identifier: email,
        })
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await expect(service.authenticate({ email, password })).toReject()

        expect(emitSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe("authenticate with Bearer token", () => {
    let registration: Registration
    beforeEach(async () => {
      registration = await registrationService.register({
        email,
        password,
      })
    })

    BEARER_SCHEMES.forEach((bearer) => {
      describe(`When it's called with a signed ${bearer} token representing the id of an existing registration`, () => {
        let token: string
        beforeEach(() => {
          token = `${bearer} ${jwt.sign({ sub: registration.id }, secret, { expiresIn })}`
        })

        it("it should return the registered entity", async () => {
          const user = await service.authenticate<Registration>(token)
          expect(user).toEqual(registration)
        })

        it("should emit a 'garmr.authenticated' event", async () => {
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          const user = await service.authenticate(token)

          expect(emitSpy).toHaveBeenCalledWith(
            GarmrAuthenticatedEvent.EVENT_NAME,
            new GarmrAuthenticatedEvent(user),
          )
        })
      })

      describe(`When it's called with a signed ${bearer} token representing the id of an existing registration (with extra spaces)`, () => {
        let token: string
        beforeEach(() => {
          token = `${bearer}          ${jwt.sign({ sub: registration.id }, secret, { expiresIn })}`
        })

        it("it should return the registered entity", async () => {
          const user = await service.authenticate<Registration>(token)
          expect(user).toEqual(registration)
        })

        it("should emit a 'garmr.authenticated' event", async () => {
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          const user = await service.authenticate(token)

          expect(emitSpy).toHaveBeenCalledWith(
            GarmrAuthenticatedEvent.EVENT_NAME,
            new GarmrAuthenticatedEvent(user),
          )
        })
      })
    })

    describe("When it's called with a signed Bearer token representing the id of an non-existing registration", () => {
      const id = v4()
      const token = `Bearer ${jwt.sign({ sub: id }, secret, { expiresIn })}`

      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          IncorrectCredentialsException,
          { identifier: id },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toMatchError(
          IncorrectCredentialsException,
          { identifier: id },
        )
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with a signed Bearer token without a sub claim", () => {
      const token = `Bearer ${jwt.sign({}, secret, { expiresIn })}`

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT payload: missing sub claim" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with a Bearer token with a future not before date", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: registration.id }, secret, {
          notBefore: "1d",
          expiresIn,
        })}`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Not active yet (nbf claim)" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an expired Bearer token", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: registration.id }, secret, {
          expiresIn: -10,
        })}`
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Token expired" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an incorrectly signed Bearer token", () => {
      let token: string
      beforeEach(() => {
        token = `Bearer ${jwt.sign({ sub: registration.id }, v4(), { expiresIn })}`
      })

      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Invalid JWT signature" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
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
        const emitSpy = jest.spyOn(eventEmitter, "emit")
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
        const payload = Buffer.from(`{"sub":"${registration.id}"}`).toString(
          "base64url",
        )
        token = `Bearer ${header}.${payload}.`
      })

      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          { message: "Invalid JWT: Invalid JWT signature" },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
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
          const emitSpy = jest.spyOn(eventEmitter, "emit")
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

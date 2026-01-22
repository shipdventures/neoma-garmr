import { faker } from "@faker-js/faker"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
import { v4 } from "uuid"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { GarmrModule } from "../garmr.module"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { AuthenticationService } from "./authentication.service"
import { RegistrationService } from "./registration.service"

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

  describe("authenticate with JWT", () => {
    let registration: Registration
    beforeEach(async () => {
      registration = await registrationService.register({
        email,
        password,
      })
    })

    describe(`When it's called with a JWT representing the id of an existing registration`, () => {
      let token: string
      beforeEach(() => {
        token = jwt.sign({ sub: registration.id }, secret, { expiresIn })
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

    describe("When it's called with JWT representing the id of an non-existing registration", () => {
      const id = v4()
      const token = jwt.sign({ sub: id }, secret, { expiresIn })
      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          IncorrectCredentialsException,
          {
            identifier: id,
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with a JWT without a sub claim", () => {
      const token = jwt.sign({}, secret, { expiresIn })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          {
            message: "Invalid JWT payload: missing sub claim",
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with a JWT with a future not before date", () => {
      let token: string
      beforeEach(() => {
        token = jwt.sign({ sub: registration.id }, secret, {
          notBefore: "1d",
          expiresIn,
        })
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          {
            message: "Invalid JWT: Not active yet (nbf claim)",
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an expired JWT", () => {
      let token: string
      beforeEach(() => {
        token = jwt.sign({ sub: registration.id }, secret, { expiresIn: -10 })
      })

      it("it should throw an InvalidCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          {
            message: "Invalid JWT: Token expired",
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called with an incorrectly signed JWT", () => {
      let token: string
      beforeEach(() => {
        token = jwt.sign({ sub: registration.id }, v4(), { expiresIn })
      })

      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          {
            message: "Invalid JWT: Invalid JWT signature",
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("When it's called without a JWT", () => {
      it("it should throw an InvalidCredentialsException", async () => {
        await expect(
          service.authenticate(undefined as unknown as string),
        ).rejects.toMatchError(InvalidCredentialsException, {
          message: "Invalid JWT: JWT not provided",
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
        token = `${header}.${payload}.`
      })

      it("it should throw an IncorrectCredentialsException", async () => {
        await expect(service.authenticate(token)).rejects.toMatchError(
          InvalidCredentialsException,
          {
            message: "Invalid JWT: Invalid JWT signature",
          },
        )
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")
        await expect(service.authenticate(token)).rejects.toThrow()
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    // MALFORMED_BEARER_TOKENS.forEach(({ header, desc, err }) => {
    //   describe(`When called with ${desc}: "${header}"`, () => {
    //     it("it should throw an InvalidCredentialsException", async () => {
    //       await expect(
    //         service.authenticate({ authorization: header }),
    //       ).rejects.toMatchError(InvalidCredentialsException, { message: err })
    //     })
    //
    //     it("should not emit a 'garmr.authenticated' event", async () => {
    //       const emitSpy = jest.spyOn(eventEmitter, "emit")
    //       await expect(
    //         service.authenticate({ authorization: header }),
    //       ).rejects.toThrow()
    //       expect(emitSpy).not.toHaveBeenCalled()
    //     })
    //   })
    // })
  })

  describe("authenticate with invalid parameters", () => {
    describe("When it's called with null", () => {
      it("it should throw an InvalidArgument Error", async () => {
        await expect(
          service.authenticate(null as unknown as string),
        ).rejects.toThrow(
          "InvalidArgument: credentials cannot be null or undefined",
        )
      })
    })
  })
})

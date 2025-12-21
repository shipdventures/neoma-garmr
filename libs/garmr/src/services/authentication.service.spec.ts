import { faker } from "@faker-js/faker"
import { Test, TestingModule } from "@nestjs/testing"
import {
  Authenticatable,
  GarmrAuthenticatedEvent,
  GarmrModule,
  RegistrationService,
} from "@lib"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
import { TypeOrmModule } from "@nestjs/typeorm"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { AuthenticationService } from "./authentication.service"
import { IncorrectCredentialsException } from "@lib/exceptions/incorrect-credentials.exception"

@Entity()
class User implements Authenticatable {
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
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
        GarmrModule.forRoot({
          secret,
          expiresIn,
          entity: User,
        }),
      ],
    }).compile()

    service = module.get<AuthenticationService>(AuthenticationService)
    registrationService = module.get<RegistrationService>(RegistrationService)
    eventEmitter = module.get<EventEmitter2>(EventEmitter2)
  })

  describe("authenticate", () => {
    describe(`Given the email ${email} and password ${password} have already been registered`, () => {
      let registration: User
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
        ).rejects.toBeInstanceOf(IncorrectCredentialsException)
      })

      it("should not emit a 'garmr.authenticated' event when password is wrong", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await expect(
          service.authenticate({ email, password: faker.internet.password() }),
        ).rejects.toThrowMatching(IncorrectCredentialsException, { email })

        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe("Given no user exists with that email", () => {
      const email = faker.internet.email()

      it("should throw IncorrectCredentialsException", async () => {
        await expect(
          service.authenticate({ email, password }),
        ).rejects.toThrowMatching(IncorrectCredentialsException, { email })
      })

      it("should not emit a 'garmr.authenticated' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await expect(service.authenticate({ email, password })).toReject()

        expect(emitSpy).not.toHaveBeenCalled()
      })
    })
  })
})

import { faker } from "@faker-js/faker"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"

import { GarmrRegisteredEvent } from "../events/garmr-registered.event"
import { EmailAlreadyExistsException } from "../exceptions/email-already-exists.exception"
import { GarmrModule } from "../garmr.module"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { RegistrationService } from "./registration.service"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm"

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: any

  @Column({ unique: true })
  public email: string

  @Column()
  public password: string
}

describe("RegistrationService", () => {
  let service: RegistrationService
  let repository: Repository<User>
  let eventEmitter: EventEmitter2

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
          secret: "test-secret",
          expiresIn: "1h",
          entity: User,
        }),
      ],
    }).compile()

    service = module.get<RegistrationService>(RegistrationService)
    repository = module.get<Repository<User>>(getRepositoryToken(User))
    eventEmitter = module.get<EventEmitter2>(EventEmitter2)
  })

  describe("register", () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    const emails = [email, email.toUpperCase(), email.toLowerCase()]
    const dto = { email, password }

    describe(`Given the email ${email} is not registered`, () => {
      it(`should create a new entity with the lowercase email ${email} and a hashed password`, async () => {
        await service.register(dto)

        const [savedUser] = await repository.find()

        expect(savedUser).toEqual({
          id: expect.any(String),
          email: email.toLowerCase(),
          password: expect.toBeBcryptHash(password),
        })
      })

      it("should return the new entity", async () => {
        const savedUser = await service.register(dto)

        const [dbUser] = await repository.find()

        expect(savedUser).toEqual(dbUser)
      })

      it("should return an instance of the configured entity", async () => {
        const savedUser = await service.register(dto)

        expect(savedUser).toBeInstanceOf(User)
      })

      it("should emit a 'garmr.registered' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        const savedUser = await service.register(dto)

        expect(emitSpy).toHaveBeenCalledWith(
          GarmrRegisteredEvent.EVENT_NAME,
          new GarmrRegisteredEvent(savedUser),
        )
      })
    })

    describe(`Given the email ${email} is already registered`, () => {
      beforeEach(() => service.register(dto))

      emails.forEach((input) => {
        it(`should throw an EmailAlreadyExistsException when called with ${input}`, async () => {
          await expect(
            service.register({ email: input, password: "pw" }),
          ).rejects.toMatchError(EmailAlreadyExistsException, { email: input })
        })
      })

      it("should not emit a 'garmr.registered' event", async () => {
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await expect(service.register(dto)).rejects.toThrow()

        expect(emitSpy).not.toHaveBeenCalled()
      })
    })
  })
})

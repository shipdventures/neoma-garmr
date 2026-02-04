import { faker } from "@faker-js/faker"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import { mailpit } from "fixtures/email/mailpit"
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { GarmrRegisteredEvent } from "../events/garmr-registered.event"
import { InvalidMagicLinkTokenException } from "../exceptions/invalid-magic-link-token.exception"
import { TokenFailedVerificationException } from "../exceptions/token-failed-verification.exception"
import { GarmrModule } from "../garmr.module"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { MAGIC_LINK_AUDIENCE, MagicLinkService } from "./magic-link.service"
import { TokenService } from "./token.service"

const subject = "Sign in to MyApp"
const html =
  '<a href="https://myapp.com/auth/verify?token={{token}}">Sign in</a>'
const from = faker.internet.email()

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: any

  @Column({ unique: true })
  public email: string
}

describe("MagicLinkService", () => {
  const secret = faker.internet.password()

  describe("send", () => {
    let service: MagicLinkService
    let tokenService: TokenService

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          GarmrModule.forRoot({
            secret,
            expiresIn: "1h",
            entity: User,
            mailer: {
              host: process.env.MAILPIT_HOST!,
              port: parseInt(process.env.MAILPIT_PORT!),
              from,
              subject,
              html,
              auth: {
                user: process.env.MAILPIT_AUTH_USER!,
                pass: process.env.MAILPIT_AUTH_PASS!,
              },
            },
          }),
        ],
      })
        .overrideProvider(TokenService)
        .useValue({
          issue: (payload: Record<string, any>) => ({
            token: Buffer.from(JSON.stringify(payload)).toString("base64url"),
            payload,
          }),
        })
        .compile()

      service = module.get<MagicLinkService>(MagicLinkService)
      tokenService = module.get<TokenService>(TokenService)
    })

    afterEach(() => {
      return mailpit.clear()
    })

    it("should send an email containing a magic link token", async () => {
      const email = faker.internet.email()

      await service.send(email)

      const { messages } = await mailpit.messages()
      const message = await mailpit.message(messages[0].ID as string)

      expect(message.To[0].Address.toLowerCase()).toBe(email.toLowerCase())
      expect(message.From.Address).toBe(from)
      expect(message.Subject).toBe(subject)
      expect(message.HTML).toContain(
        html.replace(
          "{{token}}",
          tokenService.issue({ email, aud: MAGIC_LINK_AUDIENCE }).token,
        ),
      )
    })
  })

  describe("verify", () => {
    let service: MagicLinkService
    let tokenService: TokenService
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
            secret,
            expiresIn: "1h",
            entity: User,
            mailer: {
              host: process.env.MAILPIT_HOST!,
              port: parseInt(process.env.MAILPIT_PORT!),
              from,
              subject,
              html,
              auth: {
                user: process.env.MAILPIT_AUTH_USER!,
                pass: process.env.MAILPIT_AUTH_PASS!,
              },
            },
          }),
        ],
      }).compile()

      service = module.get<MagicLinkService>(MagicLinkService)
      tokenService = module.get<TokenService>(TokenService)
      repository = module.get<Repository<User>>(getRepositoryToken(User))
      eventEmitter = module.get<EventEmitter2>(EventEmitter2)
    })

    describe("Given a valid token for a new email", () => {
      const email = faker.internet.email()

      it("should create a new user entity", async () => {
        const { token } = tokenService.issue(
          { email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        await service.verify(token)

        const users = await repository.find()
        expect(users).toHaveLength(1)
        expect(users[0].email).toBe(email.toLowerCase())
      })

      it("should return the new entity with isNewUser: true", async () => {
        const { token } = tokenService.issue(
          { email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        const result = await service.verify<User>(token)

        expect(result.entity).toBeInstanceOf(User)
        expect(result.entity.email).toBe(email.toLowerCase())
        expect(result.isNewUser).toBe(true)
      })

      it("should emit a GarmrRegisteredEvent", async () => {
        const { token } = tokenService.issue(
          { email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        const result = await service.verify<User>(token)

        expect(emitSpy).toHaveBeenCalledWith(
          GarmrRegisteredEvent.EVENT_NAME,
          new GarmrRegisteredEvent(result.entity),
        )
      })

      it("should not emit a GarmrAuthenticatedEvent", async () => {
        const { token } = tokenService.issue(
          { email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await service.verify<User>(token)

        expect(emitSpy).not.toHaveBeenCalledWith(
          GarmrAuthenticatedEvent.EVENT_NAME,
          expect.anything(),
        )
      })
    })

    describe("Given a valid token for an existing email", () => {
      let existingUser: User

      beforeEach(async () => {
        existingUser = repository.create({
          email: faker.internet.email().toLowerCase(),
        })
        await repository.save(existingUser)
      })

      it("should return the existing entity with isNewUser: false", async () => {
        const { token } = tokenService.issue(
          { email: existingUser.email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        const result = await service.verify<User>(token)

        expect(result.entity.id).toBe(existingUser.id)
        expect(result.entity.email).toBe(existingUser.email)
        expect(result.isNewUser).toBe(false)
      })

      it("should not create a new user", async () => {
        const { token } = tokenService.issue(
          { email: existingUser.email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        await service.verify<User>(token)

        const users = await repository.find()
        expect(users).toHaveLength(1)
      })

      it("should emit a GarmrAuthenticatedEvent", async () => {
        const { token } = tokenService.issue(
          { email: existingUser.email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await service.verify<User>(token)

        expect(emitSpy).toHaveBeenCalledWith(
          GarmrAuthenticatedEvent.EVENT_NAME,
          new GarmrAuthenticatedEvent(existingUser),
        )
      })

      it("should not emit a GarmrRegisteredEvent", async () => {
        const { token } = tokenService.issue(
          { email: existingUser.email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )
        const emitSpy = jest.spyOn(eventEmitter, "emit")

        await service.verify<User>(token)

        expect(emitSpy).not.toHaveBeenCalledWith(
          GarmrRegisteredEvent.EVENT_NAME,
          expect.anything(),
        )
      })
    })

    describe("Given an expired token", () => {
      it("should throw TokenFailedVerificationException with reason 'expired'", async () => {
        const { token } = tokenService.issue(
          { email: faker.internet.email(), aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: -10 },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          TokenFailedVerificationException,
          { reason: "expired" },
        )
      })
    })

    describe("Given an invalid signature", () => {
      it("should throw TokenFailedVerificationException with reason 'invalid'", async () => {
        const fakeSecret = faker.internet.password()
        const module = await Test.createTestingModule({
          imports: [
            TypeOrmModule.forRoot({
              type: "sqlite",
              database: ":memory:",
              entities: [User],
              synchronize: true,
            }),
            GarmrModule.forRoot({
              secret: fakeSecret,
              expiresIn: "1h",
              entity: User,
              mailer: {
                host: process.env.MAILPIT_HOST!,
                port: parseInt(process.env.MAILPIT_PORT!),
                from,
                subject,
                html,
                auth: {
                  user: process.env.MAILPIT_AUTH_USER!,
                  pass: process.env.MAILPIT_AUTH_PASS!,
                },
              },
            }),
          ],
        }).compile()

        const fakeTokenService = module.get<TokenService>(TokenService)
        const { token } = fakeTokenService.issue(
          { email: faker.internet.email(), aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          TokenFailedVerificationException,
          { reason: "invalid" },
        )
      })
    })

    describe("Given a token missing the email claim", () => {
      it("should throw InvalidMagicLinkTokenException", async () => {
        const { token } = tokenService.issue(
          { aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          InvalidMagicLinkTokenException,
          { reason: "missing email claim" },
        )
      })
    })

    describe("Given a token with wrong audience", () => {
      it("should throw InvalidMagicLinkTokenException when aud is 'session'", async () => {
        const { token } = tokenService.issue(
          { email: faker.internet.email(), aud: "session" },
          { expiresIn: "15m" },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          InvalidMagicLinkTokenException,
          { reason: "invalid audience" },
        )
      })

      it("should throw InvalidMagicLinkTokenException when aud is missing", async () => {
        const { token } = tokenService.issue(
          { email: faker.internet.email() },
          { expiresIn: "15m" },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          InvalidMagicLinkTokenException,
          { reason: "invalid audience" },
        )
      })

      it("should throw InvalidMagicLinkTokenException when aud has wrong value", async () => {
        const { token } = tokenService.issue(
          { email: faker.internet.email(), aud: "other" },
          { expiresIn: "15m" },
        )

        await expect(service.verify(token)).rejects.toMatchError(
          InvalidMagicLinkTokenException,
          { reason: "invalid audience" },
        )
      })
    })

    describe("Email normalization", () => {
      it("should store email as lowercase regardless of token case", async () => {
        const email = "Test.User@EXAMPLE.COM"
        const { token } = tokenService.issue(
          { email, aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        const result = await service.verify<User>(token)

        expect(result.entity.email).toBe(email.toLowerCase())
      })

      it("should find existing user with case-insensitive email lookup", async () => {
        const email = "existing@example.com"
        const existingUser = repository.create({ email })
        await repository.save(existingUser)

        const { token } = tokenService.issue(
          { email: "EXISTING@EXAMPLE.COM", aud: MAGIC_LINK_AUDIENCE },
          { expiresIn: "15m" },
        )

        const result = await service.verify<User>(token)

        expect(result.entity.id).toBe(existingUser.id)
        expect(result.isNewUser).toBe(false)
      })
    })
  })
})

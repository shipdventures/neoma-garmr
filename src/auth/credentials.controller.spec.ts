import { faker } from "@faker-js/faker"
import {
  Authenticatable,
  RegistrationService,
  TokenService,
} from "@neoma/garmr"
import { Test, TestingModule } from "@nestjs/testing"
import { Response } from "express"
import { express } from "fixtures/fakes/express"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { CredentialsController } from "./credentials.controller"

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column({ unique: true })
  public email: string

  @Column()
  public password: string
}

describe("CredentialsController", () => {
  let controller: CredentialsController<User>
  let registrationService: { register: jest.Mock }
  let tokenService: { issue: jest.Mock }
  let response: Response

  beforeEach(async () => {
    registrationService = {
      register: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: faker.string.uuid(),
          email: dto.email.toLowerCase(),
          password: dto.password,
        }),
      ),
    }

    const now = Math.floor(Date.now() / 1000)
    tokenService = {
      issue: jest.fn().mockImplementation((authenticatable) => ({
        token: Buffer.from(authenticatable.id).toString(),
        payload: {
          sub: authenticatable.id,
          iat: now,
          nbf: now,
          exp: now + 3600,
        },
      })),
    }

    response = express.response() as Response

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RegistrationService,
          useValue: registrationService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
      ],
      controllers: [CredentialsController],
    }).compile()

    controller = module.get<CredentialsController<User>>(CredentialsController)
  })

  describe("create", () => {
    const email = faker.internet.email()
    const password = "SecureP@ss1"
    const dto = { email, password }

    beforeEach(() => {})

    it("should return the registered user", async () => {
      const result = await controller.create(dto, response)

      expect(result).toMatchObject({
        id: expect.toBeString(),
        email: email.toLowerCase(),
        password,
      })
    })

    it("should set the token as an HttpOnly cookie with expiry", async () => {
      const result = await controller.create(dto, response)
      const { token, payload } = tokenService.issue(result)

      expect(response.cookie).toHaveBeenCalledWith("garmr.sid", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        expires: new Date(payload.exp * 1000),
      })
    })
  })
})

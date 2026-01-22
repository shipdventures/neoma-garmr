import { faker } from "@faker-js/faker"
import { validateOrReject } from "class-validator"

import { CredentialsDto } from "./credentials.dto"
import { credentials } from "fixtures/fakes/credentials"

const { internet } = faker
const properties = {
  email: internet.email(),
  password: internet.password(),
}

describe("CredentialsDto", () => {
  describe(`When it is created with the valid email ${properties.email} and password ${properties.password}`, () => {
    it("Then it should be valid.", () => {
      const dto = Object.assign(new CredentialsDto(), properties)
      return expect(validateOrReject(dto)).toResolve()
    })
  })

  describe("When it is created with a weak password", () => {
    it("Then it should still be valid (no strength requirement for login).", () => {
      const dto = Object.assign(new CredentialsDto(), {
        ...properties,
        password: "weak",
      })
      return expect(validateOrReject(dto)).toResolve()
    })
  })

  describe("When it is created without an email address", () => {
    it("Then it should not be valid.", () => {
      const dto = Object.assign(new CredentialsDto(), {
        ...properties,
        email: undefined,
      })
      return expect(validateOrReject(dto)).rejects.toMatchObject([
        {
          constraints: {
            isNotEmpty: "Please enter your email address.",
          },
        },
      ])
    })
  })

  credentials.invalidEmails().forEach((invalidEmail) => {
    describe(`When it is created with an invalid email ${invalidEmail}`, () => {
      it("Then it should not be valid.", () => {
        const dto = Object.assign(new CredentialsDto(), {
          ...properties,
          email: invalidEmail,
        })
        return expect(validateOrReject(dto)).rejects.toMatchObject([
          {
            constraints: {
              isEmail: "Please enter a valid email address.",
            },
          },
        ])
      })
    })
  })

  describe("When it is created with an empty password", () => {
    it("Then it should not be valid.", () => {
      const dto = Object.assign(new CredentialsDto(), {
        ...properties,
        password: "",
      })
      return expect(validateOrReject(dto)).rejects.toMatchObject([
        {
          constraints: {
            isNotEmpty: "Please enter your password.",
          },
        },
      ])
    })
  })
})

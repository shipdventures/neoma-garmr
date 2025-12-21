import { faker } from "@faker-js/faker"
import { validateOrReject } from "class-validator"
import { RegistrationDto } from "@lib/dtos/registration.dto"
import { credentials } from "fixtures/fakes/credentials"

const { internet } = faker
const properties = {
  email: internet.email(),
  password: credentials.password(),
}

describe("RegistrationDto", () => {
  describe(`When it is created with the valid email ${properties.email} and the strong password ${properties.password}`, () => {
    it("Then it should be valid.", () => {
      const dto = Object.assign(new RegistrationDto(), properties)
      return expect(validateOrReject(dto)).toResolve()
    })
  })

  describe("When it is created with an empty email", () => {
    it("Then it should not be valid.", () => {
      const dto = Object.assign(new RegistrationDto(), {
        ...properties,
        email: "",
      })
      return expect(validateOrReject(dto)).rejects.toMatchObject([
        {
          constraints: {
            isEmail: "Please enter your email address.",
          },
        },
      ])
    })
  })

  credentials.invalidEmails().forEach((invalidEmail) => {
    describe(`When it is created with an invalid email ${invalidEmail}`, () => {
      it("Then it should not be valid.", () => {
        const dto = Object.assign(new RegistrationDto(), {
          ...properties,
          email: invalidEmail,
        })
        return expect(validateOrReject(dto)).rejects.toMatchObject([
          {
            constraints: {
              isEmail: "Please enter your email address.",
            },
          },
        ])
      })
    })
  })

  describe("When it is created with an empty password", () => {
    it("Then it should not be valid.", () => {
      const dto = Object.assign(new RegistrationDto(), {
        ...properties,
        password: "",
      })
      return expect(validateOrReject(dto)).rejects.toMatchObject([
        {
          constraints: {
            isStrongPassword:
              "A strong password must be least 8 characters long and include at least 1 letter, 1 number, and 1 special character.",
          },
        },
      ])
    })
  })

  credentials.weakPasswords().forEach((weakPassword) => {
    describe(`When it is created with the weak password ${weakPassword}`, () => {
      it("Then it should not be valid.", () => {
        const dto = Object.assign(new RegistrationDto(), {
          ...properties,
          password: weakPassword,
        })
        return expect(validateOrReject(dto)).toReject()
      })
    })
  })
})

import { faker } from "@faker-js/faker"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory, ExecutionContext } from "@nestjs/common/interfaces"
import { express } from "fixtures/fakes/express"
import { executionContext } from "fixtures/fakes/nestjs"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { Authenticatable } from "../interfaces/authenticatable.interface"

import { Principal } from "./principal.decorator"

/**
 * Definition of a the object returned from Reflect.getMetadata
 * when creating a CustomParameterDecorator, used for testing
 * ParameterDecorators.
 */
type Args = Record<string, { factory: CustomParamFactory }>

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn()
  public id: number

  @Column()
  public email: string

  @Column()
  public password: string
}

const id = faker.string.uuid()
const principal = {
  id,
  email: faker.internet.email(),
  password: faker.internet.password(),
}

describe("PrincipalDecorator", () => {
  let decorator: typeof Principal
  beforeAll(() => {
    class PrincipalDecoratorTest {
      // eslint-disable-next-line
      public test(@Principal() _value: User): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, PrincipalDecoratorTest, "test")
    )

    decorator = args[Object.keys(args)[0]].factory
  })

  describe("When it is called with a response that has an account object", () => {
    it("It should return the account object.", () => {
      const context = <ExecutionContext>(
        executionContext(express.request({ principal }), express.response())
      )
      expect(decorator(null, context)).toEqual(principal)
    })
  })

  describe("When it is called with a request that does not have an account object", () => {
    it("Should throw an Error.", () => {
      const context = <ExecutionContext>(
        executionContext(express.request(), express.response())
      )
      expect(() => decorator(null, context)).toThrow(
        "PrincipalDecorator called without a principal, have you installed the AuthenticationMiddleware?",
      )
    })
  })
})

import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { UnauthorizedRedirectException } from "./unauthorized-redirect.exception"

const { UNAUTHORIZED, SEE_OTHER } = HttpStatus

describe("UnauthorizedRedirectException", () => {
  const url = faker.internet.url()
  let exception: UnauthorizedRedirectException

  beforeEach(() => {
    exception = new UnauthorizedRedirectException(url, SEE_OTHER)
  })

  it("should have the url property", () => {
    expect(exception.url).toBe(url)
  })

  it("should have the redirectStatus property", () => {
    expect(exception.redirectStatus).toBe(SEE_OTHER)
  })

  it("should return 401 (Unauthorized)", () => {
    expect(exception.getStatus()).toBe(UNAUTHORIZED)
  })

  it("should return the redirect url and status", () => {
    expect(exception.getRedirect()).toEqual({ url, status: SEE_OTHER })
  })
})

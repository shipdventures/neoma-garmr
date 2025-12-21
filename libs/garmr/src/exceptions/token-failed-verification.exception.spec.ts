import { TokenFailedVerificationException } from "./token-failed-verification.exception"
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken"

describe("TokenFailedVerificationException", () => {
  describe("when caused by TokenExpiredError", () => {
    const error = new TokenExpiredError("jwt expired", new Date())
    const exception = new TokenFailedVerificationException(error)

    it("should have the reason 'expired'", () => {
      expect(exception.reason).toBe("expired")
    })

    it("should have the message 'Token has expired.'", () => {
      expect(exception.message).toBe("Token has expired.")
    })
  })

  describe("when caused by JsonWebTokenError", () => {
    const error = new JsonWebTokenError("invalid signature")
    const exception = new TokenFailedVerificationException(error)

    it("should have the reason 'invalid'", () => {
      expect(exception.reason).toBe("invalid")
    })

    it("should have the message 'Token signature is invalid.'", () => {
      expect(exception.message).toBe("Token signature is invalid.")
    })
  })
})

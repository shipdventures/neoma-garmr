import { Test, TestingModule } from "@nestjs/testing"

import { PasswordService } from "./password.service"

describe("PasswordService", () => {
  let service: PasswordService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile()

    service = module.get<PasswordService>(PasswordService)
  })

  describe("hash", () => {
    it("should return a bcrypt hash of the password", () => {
      const password = "SecurePassword123!"
      const hash = service.hash(password)

      expect(hash).toBeBcryptHash()
    })

    it("should return different hashes for the same password (due to salt)", () => {
      const password = "SecurePassword123!"
      const hash1 = service.hash(password)
      const hash2 = service.hash(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe("compare", () => {
    it("should return true when password matches hash", () => {
      const password = "SecurePassword123!"
      const hash = service.hash(password)

      expect(service.compare(password, hash)).toBe(true)
    })

    it("should return false when password does not match hash", () => {
      const password = "SecurePassword123!"
      const wrongPassword = "WrongPassword456!"
      const hash = service.hash(password)

      expect(service.compare(wrongPassword, hash)).toBe(false)
    })
  })
})

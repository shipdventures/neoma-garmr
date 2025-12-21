import { existsSync } from "fs"
import { join } from "path"

describe("Auth Schematic (e2e)", () => {
  const authDir = join(__dirname, "..", "src/auth")

  it("should scaffold the auth directory", () => {
    expect(existsSync(authDir)).toBeTrue()
  })

  it("should scaffold auth.controller.ts", () => {
    expect(existsSync(join(authDir, "auth.controller.ts"))).toBeTrue()
  })

  it("should scaffold auth.module.ts", () => {
    expect(existsSync(join(authDir, "auth.module.ts"))).toBeTrue()
  })
})

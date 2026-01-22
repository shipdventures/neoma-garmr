import { join } from "path"

import {
  SchematicTestRunner,
  UnitTestTree,
} from "@angular-devkit/schematics/testing"

const collectionPath = join(
  __dirname,
  "../libs/garmr/dist/schematics/collection.json",
)

describe("Auth Schematic", () => {
  let runner: SchematicTestRunner
  let tree: UnitTestTree

  beforeEach(async () => {
    runner = new SchematicTestRunner("garmr", collectionPath)
    tree = await runner.runSchematic("auth", { path: "src" })
  })

  it("should generate auth.module.ts", () => {
    expect(tree.files).toContain("/src/auth/auth.module.ts")
  })

  it("should generate credentials.controller.ts", () => {
    expect(tree.files).toContain("/src/auth/credentials.controller.ts")
  })

  it("should generate sessions.controller.ts", () => {
    expect(tree.files).toContain("/src/auth/sessions.controller.ts")
  })

  it("should generate me.controller.ts", () => {
    expect(tree.files).toContain("/src/auth/me.controller.ts")
  })
})

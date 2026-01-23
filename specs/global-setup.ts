import { execSync } from "child_process"
import { join } from "path"

import { v4 } from "uuid"

export default async (): Promise<void> => {
  process.env.GARMR_SECRET = v4()

  const projectRoot = join(__dirname, "..")

  execSync("npm run build", {
    cwd: projectRoot,
    stdio: "inherit",
  })

  execSync("npm run build:schematics", {
    cwd: projectRoot,
    stdio: "inherit",
  })

  execSync("nest g -c @neoma/garmr auth --path src/api/auth --no-spec", {
    cwd: projectRoot,
    stdio: "inherit",
  })
}

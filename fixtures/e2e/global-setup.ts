import { execSync } from "child_process"
import { join } from "path"

import specsSetup from "../specs/global-setup"

export default async (): Promise<void> => {
  const projectRoot = join(__dirname, "..", "..")

  execSync("npm run build", {
    cwd: projectRoot,
    stdio: "inherit",
  })

  await specsSetup()
}

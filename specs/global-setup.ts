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

  // execSync(
  //   "nest g -c ./libs/garmr/dist/schematics/collection.json auth --no-spec",
  //   {
  //     cwd: projectRoot,
  //     stdio: "inherit",
  //   },
  // )
}

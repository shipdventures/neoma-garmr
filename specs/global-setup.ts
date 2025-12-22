import { execSync } from "child_process"
import { join } from "path"

export default async (): Promise<void> => {
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

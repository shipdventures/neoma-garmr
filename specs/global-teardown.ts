import { existsSync, rmSync } from "fs"
import { join } from "path"

export default async (): Promise<void> => {
  const authDir = join(__dirname, "..", "src/api/auth")

  if (existsSync(authDir)) {
    rmSync(authDir, { recursive: true })
  }
}

import { execSync } from "child_process"

export default async (): Promise<void> => {
  const NODE_ENV = process.env.NODE_ENV || "specs"
  execSync(`docker rm -f garmr-mailpit-${NODE_ENV}`, { stdio: "ignore" })
}

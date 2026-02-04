import { execSync } from "child_process"
import { randomBytes, randomUUID } from "crypto"
import { join } from "path"

const NODE_ENV = process.env.NODE_ENV || "specs"
const isE2E = NODE_ENV === "e2e"

// Mailpit ports: specs uses 1025/8025, e2e uses 1026/8026
const MAILPIT_PORT = isE2E ? 1026 : 1025
const MAILPIT_API_PORT = isE2E ? 8026 : 8025

// Set environment variables for tests
process.env.GARMR_SECRET = randomBytes(32).toString("hex")
process.env.MAILPIT_HOST = "localhost"
process.env.MAILPIT_PORT = String(MAILPIT_PORT)
process.env.MAILPIT_API_PORT = String(MAILPIT_API_PORT)
process.env.MAILPIT_API = `http://localhost:${MAILPIT_API_PORT}/api/v1`
process.env.MAILPIT_AUTH_USER = "ripley"
process.env.MAILPIT_AUTH_PASS = "xenomorph"
process.env.APP_URL = `https://${randomUUID()}.test`
process.env.MAGIC_LINK_FROM = `${randomUUID()}@weylandyutani.com`
process.env.MAGIC_LINK_SUBJECT = `Sign in ${randomUUID()}`

export default async (): Promise<void> => {
  const htpasswdPath = join(__dirname, "..", "email", "smtp-auth.htpasswd")

  execSync(`docker rm -f garmr-mailpit-${NODE_ENV}`, { stdio: "ignore" })

  execSync(
    `docker run -d --name garmr-mailpit-${NODE_ENV} -p ${MAILPIT_PORT}:1025 -p ${MAILPIT_API_PORT}:8025 -v ${htpasswdPath}:/auth.htpasswd:ro axllent/mailpit --smtp-auth-file /auth.htpasswd --smtp-auth-allow-insecure`,
    { stdio: "inherit" },
  )
}

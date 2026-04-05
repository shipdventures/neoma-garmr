import { Server } from "http"

import { INestApplication } from "@nestjs/common"
import { mailpit } from "fixtures/email/mailpit"
import request from "supertest"

export interface AuthResult {
  /** The session JWT from the response body */
  token: string
  /** The raw Set-Cookie header value */
  cookie: string
  /** The authenticated user */
  user: { id: string; email: string }
}

/**
 * Authenticates a user via the full magic link flow:
 * sends email, extracts token from mailpit, verifies it,
 * and returns the session token, cookie, and user.
 *
 * @param app - The NestJS application instance
 * @param email - The email address to authenticate
 * @returns The session token, Set-Cookie header, and user details
 */
export const authenticateViaEmail = async (
  app: INestApplication,
  email: string,
): Promise<AuthResult> => {
  const server = app.getHttpServer() as Server

  await request(server).post("/magic-link").send({ email }).expect(202)

  const { messages } = await mailpit.messages()
  const message = await mailpit.message(messages[0].ID as string)
  const verificationUrl = message.Text.match(/[a-z]+[:.].*?(?=\s)/)[0] as string
  const magicLinkToken = verificationUrl.substring(
    verificationUrl.indexOf("=") + 1,
  )

  const response = await request(server)
    .get("/magic-link/verify")
    .query({ token: magicLinkToken })
    .expect(200)

  const setCookie = response.headers["set-cookie"]

  return {
    token: response.body.token,
    cookie: Array.isArray(setCookie) ? setCookie[0] : setCookie,
    user: response.body.user,
  }
}

/**
 * Extracts the `name=value` portion from a Set-Cookie header,
 * stripping attributes like HttpOnly, Secure, Path, etc.
 *
 * @param setCookie - The raw Set-Cookie header string
 * @returns The cookie in `name=value` format for use in a Cookie request header
 */
export const extractCookieValue = (setCookie: string): string => {
  return setCookie.split(";")[0]
}

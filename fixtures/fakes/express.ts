import crypto from "crypto"
import { OutgoingHttpHeader } from "http"
import { OutgoingHttpHeaders } from "http2"
import { Socket } from "net"

import { faker } from "@faker-js/faker"
import { Request, Response } from "express"

const { helpers, internet, system } = faker

const caseInsensitiveSearch = (
  obj: OutgoingHttpHeaders,
  key: string,
): OutgoingHttpHeader | undefined => {
  return obj[key] || obj[key.toLowerCase()]
}

const convertHeadersToLowerCase = (
  headers: OutgoingHttpHeaders = {},
): OutgoingHttpHeaders => {
  const clonedHeaders = { ...headers }
  Object.keys(clonedHeaders).forEach((key) => {
    clonedHeaders[key.toLowerCase()] = clonedHeaders[key]
    delete clonedHeaders[key]
  })
  return clonedHeaders
}

type ExpressFixtures = {
  /**
   * Creates a signed cookie string using the provided value and secret according
   * to how the cookie-parser library would sign a cookie, i.e. HMAC-SHA256.
   *
   * @param val The cookie value to sign, if an object it will be JSON.stringified
   * to create the string that will be signed.
   * @param secret The secret to use to sign the cookie. If not provided an unsigned
   * cookie will be returend.
   *
   * @returns The signed cookie string in the format of `sess=${prefix}${val}.${signature}; Path=/`
   * with prefix and signature being encoded with encodeURIComponent.
   *
   * Note: The prefix s: is used to signed cookies j: is used for json cookies,
   * and s:j: is used for signed json cookies.
   *
   * @see https://github.com/expressjs/cookie-parser?tab=readme-ov-file#cookieparsersecret-options
   */
  cookie(val: string | object, secret?: string): string

  /**
   * Creates a Partial Response object with status, json, and header functions that
   * are instances of a jest.Mock and with a locals property.
   *
   * @param locals Any locals to populate the response's locals property.
   * @param headers Any headers to set on the response. They will be accessible through
   * both the getHeaders and get functions.
   *
   * @returns A Partial Response object with status, get, getHeaders, removeHeader, json,
   * header, render and send functions, and a locals property.
   */
  response: (
    options?: Partial<Response & { headers?: OutgoingHttpHeaders }>,
  ) => Partial<Response>

  /**
   * Creates a Partial Request object with body, and headers properties, and a partial response
   * object. Also adds convenience methods get and header to provide case insensitive access to
   * the request headers.
   *
   * @param req A Partial Request to provide values for body, headers, and res objects,
   * and get, and headers functions. Any properties not provided will use sensible defaults.
   */
  request: (options?: Partial<Request>) => Partial<Request>
}

export const express: ExpressFixtures = {
  cookie(val: string | object, secret: string | undefined): string {
    const cookieValue = typeof val === "string" ? val : JSON.stringify(val)
    const prefix = typeof val === "string" ? "s:" : "s:j:"
    if (!secret) {
      return `sess=${encodeURIComponent(prefix)}${cookieValue}; Path=/; httpOnly; SameSite=Strict`
    }

    const signature = crypto
      .createHmac("sha256", secret)
      .update(cookieValue)
      .digest("base64")
      .replace(/=+$/, "")

    return `sess=${encodeURIComponent(prefix)}${cookieValue}.${encodeURIComponent(signature)}; Path=/; httpOnly; SameSite=Strict`
  },

  response(
    {
      locals = {},
      headers = {},
    }: Partial<Response & { headers?: OutgoingHttpHeaders }> = {
      locals: {},
      headers: {},
    },
  ): Partial<Response> {
    const clonedHeaders = convertHeadersToLowerCase(headers)
    return {
      getHeaders(): OutgoingHttpHeaders {
        return clonedHeaders
      },
      get(name: string): string | undefined {
        return caseInsensitiveSearch(clonedHeaders, name) as string
      },
      header(field: string, value?: string | Array<string>): Response {
        clonedHeaders[field] = value
        return this as Response
      },
      removeHeader(name): void {
        delete clonedHeaders[name]
        delete clonedHeaders[name.toLowerCase()]
      },
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      render: jest.fn(),
      redirect: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals,
    }
  },

  request(
    {
      body = {},
      headers = {},
      method = helpers.arrayElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url = internet.url(),
      res = express.response() as Response,
      path = system.filePath(),
      params = {},
      signedCookies = {},
    }: Partial<Request> = {
      body: {},
      headers: {},
      method: helpers.arrayElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url: internet.url(),
      res: express.response() as Response,
      path: system.filePath(),
      params: {},
      signedCookies: {},
    },
  ): Partial<Request> {
    const req = {
      get(name: string): any {
        return caseInsensitiveSearch(headers, name)
      },
      header(name: string): any {
        return caseInsensitiveSearch(headers, name) as string
      },
      body,
      headers,
      method,
      url,
      res: <Response>res,
      path,
      params,
      signedCookies,
      // eslint-disable-next-line prefer-rest-params
      ...(arguments[0] as Partial<Request>),
      // Must include the connection so that the Bunyan req seriazlier treats it as a real request.
      connection: {} as Socket,
    }

    return req
  },
} as const

import crypto from "crypto"
import { IncomingHttpHeaders, OutgoingHttpHeader } from "http"
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

const convertHeadersToLowerCase = <T extends Record<string, unknown>>(
  headers: T = {} as T,
): T => {
  const clonedHeaders = { ...headers } as Record<string, unknown>
  Object.keys(clonedHeaders).forEach((key) => {
    clonedHeaders[key.toLowerCase()] = clonedHeaders[key]
    delete clonedHeaders[key]
  })
  return clonedHeaders as T
}

/**
 * Mirrors the Express Response interface — method signatures match
 * express.Response, not the underlying Node http.ServerResponse.
 */
export interface MockResponse {
  getHeaders(): OutgoingHttpHeaders
  get(name: string): string | undefined
  header(field: string, value?: string | Array<string>): MockResponse
  getHeader(name: string): string | number | string[] | undefined
  setHeader(name: string, value: string | string[]): MockResponse
  removeHeader(name: string): void
  cookie: jest.Mock
  clearCookie: jest.Mock
  end: jest.Mock
  status: jest.Mock
  json: jest.Mock
  render: jest.Mock
  redirect: jest.Mock
  send: jest.Mock
  locals: Record<string, any>
}

export interface MockRequest {
  get(name: string): any
  header(name: string): any
  body: any
  headers: IncomingHttpHeaders
  method: string
  url: string
  res: MockResponse
  path: string
  params: Record<string, string>
  signedCookies: Record<string, string>
  connection: Socket
  [key: string]: any
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
   * Creates a MockResponse with status, json, and header functions that
   * are instances of a jest.Mock and with a locals property.
   *
   * @param options.locals Any locals to populate the response's locals property.
   * @param options.headers Any headers to set on the response. They will be accessible through
   * both the getHeaders and get functions.
   *
   * @returns A MockResponse with status, get, getHeaders, removeHeader, json,
   * header, render and send functions, and a locals property.
   */
  response: (options?: {
    locals?: Record<string, any>
    headers?: OutgoingHttpHeaders
  }) => MockResponse

  /**
   * Creates a MockRequest with body, and headers properties, and a mock response
   * object. Also adds convenience methods get and header to provide case insensitive
   * access to the request headers.
   *
   * @param req A Partial MockRequest to provide values for body, headers, and res objects,
   * and get, and headers functions. Any properties not provided will use sensible defaults.
   */
  request: (options?: Partial<MockRequest>) => MockRequest
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
    }: { locals?: Record<string, any>; headers?: OutgoingHttpHeaders } = {
      locals: {},
      headers: {},
    },
  ): MockResponse {
    const clonedHeaders = convertHeadersToLowerCase(headers)
    return {
      getHeaders(): OutgoingHttpHeaders {
        return clonedHeaders
      },
      get(name: string): string | undefined {
        return caseInsensitiveSearch(clonedHeaders, name) as string
      },
      header(field: string, value?: string | Array<string>): MockResponse {
        clonedHeaders[field.toLowerCase()] = value
        return this
      },
      getHeader(name: string): string | number | string[] | undefined {
        return clonedHeaders[name.toLowerCase()] as
          | string
          | number
          | string[]
          | undefined
      },
      setHeader(name: string, value: string | string[]): MockResponse {
        clonedHeaders[name.toLowerCase()] = value
        return this
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
      res = express.response(),
      path = system.filePath(),
      params = {},
      signedCookies = {},
    }: Partial<MockRequest> = {
      body: {},
      headers: {},
      method: helpers.arrayElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url: internet.url(),
      res: express.response(),
      path: system.filePath(),
      params: {},
      signedCookies: {},
    },
  ): MockRequest {
    const normalizedHeaders = convertHeadersToLowerCase(headers)
    return {
      get(name: string): any {
        return normalizedHeaders[name.toLowerCase()]
      },
      header(name: string): any {
        return normalizedHeaders[name.toLowerCase()]
      },
      body,
      headers: normalizedHeaders,
      method,
      url,
      res,
      path,
      params,
      signedCookies,
      // eslint-disable-next-line prefer-rest-params
      ...(arguments[0] as Partial<MockRequest>),
      // Must include the connection so that the Bunyan req seriazlier treats it as a real request.
      connection: {} as Socket,
    }
  },
} as const

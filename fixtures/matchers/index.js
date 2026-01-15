/* eslint-disable @typescript-eslint/no-require-imports */
const { EXPECTED_COLOR, RECEIVED_COLOR } = require("jest-matcher-utils")
const _ = require("lodash")
const bcrypt = require("bcrypt")

const matchError = function (subject, ErrorClass, expectedProps) {
  // If it's a function, call it and catch
  if (subject instanceof Function) {
    try {
      subject()
      return {
        pass: false,
        message: () =>
          `Expected function to throw ${EXPECTED_COLOR(ErrorClass.name)}, but it did not throw`,
      }
    } catch (e) {
      subject = e
    }
  }

  // Check type
  if (!(subject instanceof ErrorClass)) {
    return {
      pass: false,
      message: () =>
        `Expected ${EXPECTED_COLOR(ErrorClass.name)} but got ${RECEIVED_COLOR(subject?.constructor?.name || typeof subject)}`,
    }
  }

  // If no props specified, just type check passes
  if (!expectedProps) {
    return {
      pass: true,
      message: () => `Expected not to be ${EXPECTED_COLOR(ErrorClass.name)}`,
    }
  }

  // Check properties
  for (const [key, value] of Object.entries(expectedProps)) {
    if (!_.isEqual(subject[key], value)) {
      return {
        pass: false,
        message: () =>
          `Expected ${EXPECTED_COLOR(ErrorClass.name)} with ${EXPECTED_COLOR(`${key}: ${JSON.stringify(value)}`)}, got ${RECEIVED_COLOR(`${key}: ${JSON.stringify(subject[key])}`)}`,
      }
    }
  }

  return {
    pass: true,
    message: () =>
      `Expected not to be ${EXPECTED_COLOR(ErrorClass.name)} with given properties`,
  }
}

const toBeBcryptHash = function (hash, plaintext) {
  const isValidHash = /^\$2[ayb]\$.{56}$/.test(hash)

  if (!isValidHash) {
    return {
      pass: false,
      message: () => `Expected a valid bcrypt hash, received: ${hash}`,
    }
  }

  // No plaintext provided - just format check
  if (plaintext === undefined) {
    return {
      pass: true,
      message: () => `Expected "${hash}" NOT to be a bcrypt hash, but it was`,
    }
  }

  // Plaintext provided - check match
  const pass = bcrypt.compareSync(plaintext, hash)
  return {
    pass,
    message: () =>
      pass
        ? `Expected "${hash}" NOT to be a bcrypt hash of "${plaintext}", but it was`
        : `Expected "${hash}" to be a bcrypt hash of "${plaintext}", but it wasn't`,
  }
}

const createBcryptMatcher = (plaintext) => ({
  $$typeof: Symbol.for("jest.asymmetricMatcher"),

  asymmetricMatch(hash) {
    const isValidHash = /^\$2[ayb]\$.{56}$/.test(hash)

    if (!isValidHash) {
      console.log(`Not a valid bcrypt hash: ${hash}`)
      return false
    }

    // No plaintext - just format check
    if (plaintext === undefined) {
      return true
    }

    // With plaintext - check match
    const matches = bcrypt.compareSync(plaintext, hash)
    if (!matches) {
      console.log(
        `Expected "${hash}" to be a bcrypt hash of "${plaintext}", but it wasn't`,
      )
    }
    return matches
  },

  toString() {
    return plaintext === undefined
      ? "toBeBcryptHash"
      : `toBeBcryptHash<${plaintext}>`
  },

  toAsymmetricMatcher() {
    return plaintext === undefined ? "BcryptHash" : `BcryptHashOf<${plaintext}>`
  },
})

expect.extend({
  toThrowMatching: matchError,
  toMatchError: matchError,
  toBeBcryptHash,
})

expect.toBeBcryptHash = createBcryptMatcher

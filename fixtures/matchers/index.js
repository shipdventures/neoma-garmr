/* eslint-disable @typescript-eslint/no-require-imports */
const { EXPECTED_COLOR, RECEIVED_COLOR } = require("jest-matcher-utils")
const _ = require("lodash")

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

expect.extend({
  toThrowMatching: matchError,
  toMatchError: matchError,
})

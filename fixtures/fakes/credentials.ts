import { faker } from "@faker-js/faker"

const { helpers, internet, person, string } = faker
const PASSWORD_MIN_LENGTH = 8

export const credentials = {
  /**
   * Creates a strong random password containing a mixture of
   * alpha, uppercase alpha, numeric, and symbol characters.
   *
   * @returns A strong random password.
   */
  password(): string {
    const alpha = string.alpha(PASSWORD_MIN_LENGTH - 3).toLowerCase()
    const alphaUpper = string
      .alpha({ length: { min: 1, max: 5 } })
      .toUpperCase()
    const numeric = string.numeric({ length: { min: 1, max: 5 } })
    const symbol = string.symbol({ min: 1, max: 5 })
    return `${alphaUpper}${alpha}${numeric}${symbol}`
  },

  /**
   * Creates an array of weak passwords.
   * - Only letters.
   * - Only numbers.
   * - Only symbols.
   * - Letters and numbers.
   * - Letters and symbols.
   * - Numbers and symbols.
   * - Valid but too short.
   *
   * @returns An array of weak passwords.
   */
  weakPasswords(): Array<string> {
    const passwords = [
      // Blank.
      // "",
      // Only letters.
      string.alpha(PASSWORD_MIN_LENGTH),
      // Only numbers.
      string.numeric(PASSWORD_MIN_LENGTH),
      // Only symbols
      string.symbol(PASSWORD_MIN_LENGTH),
      // Letters and numbers.
      string.alphanumeric(PASSWORD_MIN_LENGTH),
      // Letters and symbols
      `${string.alpha(PASSWORD_MIN_LENGTH - 1)}${string.symbol()}`,
      // Numbers and symbols
      `${string.numeric(PASSWORD_MIN_LENGTH - 1)}${string.symbol()}`,
      // Valid but too short.
      `${string.alphanumeric(PASSWORD_MIN_LENGTH - 2)}${string.symbol()}`,
    ]

    if (process.env.NODE_ENV === "CI") {
      return helpers.arrayElements(passwords, 2)
    }

    return passwords
  },

  /**
   * Creates an array of invalid emails.
   * - Word
   * - Word@
   * - Word@Domain
   * - Word@Domain.
   * - Word@Domain.c
   *
   * @returns An array of invalid emails.
   */
  invalidEmails(): Array<string> {
    const emails = [
      // "",
      person.firstName(),
      `${person.firstName()}@`,
      `${person.firstName()}@${internet.domainWord()}`,
      `${person.firstName()}@${internet.domainWord()}.`,
      `${person.firstName()}@${internet.domainWord()}.c`,
    ]

    return emails
  },
}

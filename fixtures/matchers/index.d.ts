export {}

type AsymmetricMatcher<T> = {
  asymmetricMatch(other: T): boolean
}

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if a function throws an instance of an error class, optionally with specific properties.
       *
       * @example
       * // Type check only
       * expect(() => service.register()).toThrowMatching(EmailAlreadyExistsException)
       *
       * // Type check with properties
       * expect(() => service.register()).toThrowMatching(EmailAlreadyExistsException, { email: 'test@example.com' })
       *
       * @param ErrorClass The expected error class/constructor
       * @param expectedProps Optional object of properties to match
       */
      toThrowMatching<T>(
        ErrorClass: new (...args: any[]) => T,
        expectedProps?: Partial<T>,
      ): R

      /**
       * Checks if a value is an instance of an error class, optionally with specific properties.
       *
       * @example
       * // Type check only
       * expect(error).toMatchError(EmailAlreadyExistsException)
       *
       * // Type check with properties
       * expect(error).toMatchError(EmailAlreadyExistsException, { email: 'test@example.com' })
       *
       * @param ErrorClass The expected error class/constructor
       * @param expectedProps Optional object of properties to match
       */
      toMatchError<T>(
        ErrorClass: new (...args: any[]) => T,
        expectedProps?: Partial<T>,
      ): R

      toBeBcryptHash(plaintext?: string): R
    }

    interface Expect {
      toBeBcryptHash(plaintext?: string): AsymmetricMatcher<string>
    }
  }
}

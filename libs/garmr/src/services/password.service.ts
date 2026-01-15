import { Injectable } from "@nestjs/common"
import * as bcrypt from "bcrypt"

/**
 * Service for secure password hashing and comparison.
 *
 * Abstracts the password hashing algorithm to allow centralized configuration
 * and easier algorithm changes in the future.
 *
 * @example
 * ```typescript
 * // Hash a password for storage
 * const hash = passwordService.hash(plainPassword)
 *
 * // Verify a password against a stored hash
 * const isValid = passwordService.compare(plainPassword, storedHash)
 * ```
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 10

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param password - The plain text password to hash
   * @returns The bcrypt hash of the password
   */
  public hash(password: string): string {
    return bcrypt.hashSync(password, this.saltRounds)
  }

  /**
   * Compares a plain text password against a bcrypt hash.
   *
   * @param password - The plain text password to verify
   * @param hash - The bcrypt hash to compare against
   * @returns True if the password matches the hash, false otherwise
   */
  public compare(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash)
  }
}

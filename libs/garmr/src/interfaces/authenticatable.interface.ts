/**
 * Interface that must be implemented by any entity that can be authenticated.
 *
 * @example
 * ```typescript
 * import { Authenticatable } from '@neoma/garmr'
 * import { Exclude } from 'class-transformer'
 *
 * @Entity()
 * class User implements Authenticatable {
 *   @PrimaryGeneratedColumn()
 *   id: any
 *
 *   @Column({ unique: true })
 *   email: string
 *
 *   @Column({ nullable: true })
 *   @Exclude() // Recommended: prevents accidental serialization
 *   password: string
 * }
 * ```
 */
export interface Authenticatable {
  /**
   * Unique identifier for the entity.
   */
  id: any

  /**
   * Email address used for authentication.
   * Should be stored as lowercase for case-insensitive lookups.
   * Add a unique constraint on this column.
   */
  email: string

  /**
   * Hashed password. Nullable to support OAuth-only users.
   *
   * @security Use @Exclude() from class-transformer to prevent
   * accidental serialization in API responses.
   */
  password: string
}

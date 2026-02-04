/**
 * Interface that must be implemented by any entity that can be authenticated.
 *
 * @example
 * ```typescript
 * import { Authenticatable } from '@neoma/garmr'
 *
 * @Entity()
 * class User implements Authenticatable {
 *   @PrimaryGeneratedColumn('uuid')
 *   public id: string
 *
 *   @Column({ unique: true })
 *   public email: string
 *
 *   @Column('simple-array', { default: '' })
 *   public permissions: string[]
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
   * Optional array of permission strings for authorization.
   * Permissions follow the format `action:resource` (e.g., `read:users`).
   * Supports wildcards: `*` (superuser), `*:resource`, `action:*`.
   */
  permissions?: string[]
}

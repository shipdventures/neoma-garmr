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
}

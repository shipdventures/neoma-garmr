import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { Authenticatable } from "@neoma/garmr"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  email: string

  @Column()
  password: string
}

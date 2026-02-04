import { Authenticatable } from "@neoma/garmr"
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column({ unique: true })
  public email: string
}

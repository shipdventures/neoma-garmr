import { Authenticatable } from "@neoma/garmr"
import { Exclude } from "class-transformer"
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column()
  public email: string

  @Exclude()
  @Column()
  public password: string
}

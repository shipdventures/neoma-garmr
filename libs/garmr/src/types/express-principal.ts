import { Authenticatable } from "../interfaces/authenticatable.interface"

declare module "express" {
  interface Request {
    principal?: Authenticatable
  }
}

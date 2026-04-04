import { type Authenticatable } from "../interfaces/authenticatable.interface"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      principal?: Authenticatable
    }
  }
}

export {}

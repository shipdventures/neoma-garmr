import { Authenticatable } from "../interfaces/authenticatable.interface"
import { LoggerService } from "@nestjs/common"

declare global {
  namespace Express {
    interface Request {
      logger?: LoggerService
      principal?: Authenticatable
    }
  }
}

export {}

import { LoggerService } from "@nestjs/common"

import { Authenticatable } from "../interfaces/authenticatable.interface"

declare global {
  namespace Express {
    interface Request {
      logger?: LoggerService
      principal?: Authenticatable
    }
  }
}

export {}

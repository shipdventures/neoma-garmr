import { LoggerService } from "@nestjs/common"

declare global {
  namespace Express {
    interface Request {
      logger?: LoggerService
    }
  }
}

export {}


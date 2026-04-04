import { LoggerService } from "@nestjs/common"

declare module "express" {
  interface Request {
    logger?: LoggerService
  }
}

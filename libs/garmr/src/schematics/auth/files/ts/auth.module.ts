import { Module } from "@nestjs/common"
import { AuthController } from "./registration.controller"

@Module({
  controllers: [AuthController],
})
export class AuthModule {}

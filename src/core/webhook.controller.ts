import { WebhookSignatureGuard } from "@lib"
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common"

/**
 * Demo controller for testing WebhookSignatureGuard in e2e specs.
 */
@Controller("webhooks")
export class WebhookController {
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  public handleWebhook(): { received: boolean } {
    return { received: true }
  }
}

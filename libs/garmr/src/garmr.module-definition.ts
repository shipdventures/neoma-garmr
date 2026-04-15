import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { GarmrOptions, GARMR_OPTIONS } from "./garmr.options"
import { WebhookSignatureGuard } from "./guards/webhook-signature.guard"
import { AuthenticationService } from "./services/authentication.service"
import { MagicLinkService } from "./services/magic-link.service"
import { PermissionService } from "./services/permission.service"
import { SessionService } from "./services/session.service"
import { TokenService } from "./services/token.service"

const GARMR_PROVIDERS = [
  AuthenticationService,
  MagicLinkService,
  PermissionService,
  SessionService,
  TokenService,
  WebhookSignatureGuard,
]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<GarmrOptions>({
  optionsInjectionToken: GARMR_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    global: true,
    imports: [EventEmitterModule.forRoot(), ...(definition.imports ?? [])],
    providers: [...(definition.providers ?? []), ...GARMR_PROVIDERS],
    exports: [...(definition.exports ?? []), ...GARMR_PROVIDERS, GARMR_OPTIONS],
  }))
  .build()

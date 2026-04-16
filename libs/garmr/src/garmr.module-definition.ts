import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { GarmrOptions, GARMR_OPTIONS } from "./garmr.options"
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
    // Services are exported so consumers can inject them directly
    // (e.g. AuthenticationService, SessionService).
    // GARMR_OPTIONS is exported so that guards resolved on-demand
    // (e.g. WebhookSignatureGuard) can access the configuration
    // via @Inject(GARMR_OPTIONS).
    exports: [...(definition.exports ?? []), ...GARMR_PROVIDERS, GARMR_OPTIONS],
  }))
  .build()

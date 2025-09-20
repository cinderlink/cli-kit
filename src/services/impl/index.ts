/**
 * Service Implementations - Live implementations of all services
 */

import { Layer } from "effect"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService,
  HitTestService,
  MouseRouterService
} from "@/services/index"
import { TerminalServiceLive } from "./terminal-impl.ts"
import { InputServiceLive } from "./input-impl.ts"
import { RendererServiceLive } from "./renderer-impl.ts"
import { StorageServiceLive } from "./storage-impl.ts"
import { HitTestServiceLive } from "../hit-test.ts"
import { MouseRouterServiceLive } from "../mouse-router.ts"

// Export individual service implementations
export * from "./terminal-impl.ts"
export * from "./input-impl.ts"
export * from "./renderer-impl.ts"
export * from "./storage-impl.ts"

/**
 * Complete live service layer with all services
 * RendererService depends on TerminalService, so we provide Terminal first
 * MouseRouterService depends on HitTestService
 */
export const LiveServices = TerminalServiceLive.pipe(
  Layer.merge(InputServiceLive),
  Layer.merge(StorageServiceLive),
  Layer.merge(RendererServiceLive),
  Layer.merge(Layer.effect(HitTestService, HitTestServiceLive)),
  Layer.merge(Layer.effect(MouseRouterService, MouseRouterServiceLive))
)

/**
 * Test service layer for testing
 */
// Note: Use typed testing layers from src/testing/test-utils.ts in tests.

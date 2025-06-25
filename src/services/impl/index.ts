/**
 * Service Implementations - Live implementations of all services
 */

import { Layer } from "effect"
import { 
  TerminalService,
  InputService,
  RendererService,
  StorageService
} from "@/services/index.ts"
import { TerminalServiceLive } from "./terminal-impl.ts"
import { InputServiceLive } from "./input-impl.ts"
import { RendererServiceLive } from "./renderer-impl.ts"
import { StorageServiceLive } from "./storage-impl.ts"

// Export individual service implementations
export * from "./terminal-impl.ts"
export * from "./input-impl.ts"
export * from "./renderer-impl.ts"
export * from "./storage-impl.ts"

/**
 * Complete live service layer with all services
 * RendererService depends on TerminalService, so we provide Terminal first
 */
export const LiveServices = TerminalServiceLive.pipe(
  Layer.merge(InputServiceLive),
  Layer.merge(StorageServiceLive),
  Layer.merge(RendererServiceLive)
)

/**
 * Test service layer for testing
 */
export const TestServices = Layer.mergeAll([
  Layer.succeed(TerminalService, {} as any),
  Layer.succeed(InputService, {} as any),
  Layer.succeed(RendererService, {} as any),
  Layer.succeed(StorageService, {} as any)
])
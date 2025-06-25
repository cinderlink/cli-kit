/**
 * @cinderlink/cli-kit - A performant TUI framework for Bun
 * 
 * Inspired by BubbleTea but built for TypeScript with Effect.ts integration
 * and optimized for Bun's performance characteristics.
 * 
 * @example
 * ```typescript
 * import { Component, Effect, runTUIApp } from "@cinderlink/cli-kit"
 * 
 * const MyApp: Component<Model, Msg> = {
 *   init: Effect.succeed([initialModel, []]),
 *   update: (msg, model) => Effect.succeed([newModel, []]),
 *   view: (model) => ({ render: () => Effect.succeed("Hello World!") })
 * }
 * 
 * runTUIApp(MyApp)
 * ```
 */

// Core framework exports
export * from "./core/index.ts"

// Service interfaces (selective export to avoid conflicts)
export {
  TerminalService,
  InputService,
  RendererService,
  StorageService
} from "./services/index.ts"

// Testing utilities are exported separately - import from "@cinderlink/cli-kit/testing"

// View system
export * as View from "./core/view.ts"

// Version information
export const VERSION = "0.1.0" as const

// Framework metadata
export const FRAMEWORK_INFO = {
  name: "@cinderlink/cli-kit",
  version: VERSION,
  description: "A performant TUI framework for Bun inspired by bubbletea",
  repository: "https://github.com/cinderlink/cli-kit",
  license: "MIT"
} as const
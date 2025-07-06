/**
 * TUIX - A performant TUI framework for Bun
 * 
 * Built for TypeScript with JSX support, reactive state management via runes,
 * and Effect.ts integration, optimized for Bun's performance characteristics.
 * 
 * @example
 * ```typescript
 * import { Component, Effect, runTUIApp } from "tuix"
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

// Testing utilities are exported separately - import from "tuix/testing"

// View system
export * as View from "./core/view.ts"

// Reactivity system - Svelte-inspired runes
export * from "./reactivity/index.ts"

// JSX runtime
export * from "./jsx-runtime.ts"

// Components
export * from "./components/index.ts"

// Styling
export * from "./styling/index.ts"

// CLI framework
export * from "./cli/index.ts"

// Version information
export const VERSION = "1.0.0-rc.2" as const

// Framework metadata
export const FRAMEWORK_INFO = {
  name: "tuix",
  version: VERSION,
  description: "A performant TUI framework for Bun with JSX and reactive state management",
  repository: "https://github.com/cinderlink/tuix",
  license: "MIT"
} as const
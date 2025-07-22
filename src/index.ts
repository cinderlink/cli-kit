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

// Interactive mode management
export { Interactive, InteractiveContextLive, type InteractiveConfig } from "./core/runtime/interactive.ts"

// Service interfaces (selective export to avoid conflicts)
export {
  TerminalService,
  InputService,
  RendererService,
  StorageService
} from "./core/services/index.ts"

// Testing utilities are exported separately - import from "tuix/testing"

// View system
export * as View from "./core/view/primitives/view.ts"
// Export commonly used view primitives directly
export { text, vstack, hstack, box, empty } from "./core/view/primitives/view.ts"

// Reactivity system - Svelte-inspired runes
export * from "./core/update/reactivity/index.ts"

// JSX runtime and JSX app components
export * from "./jsx/index"

// UI Components
export * from "./ui/components/index.ts"

// Styling
export * from "./core/terminal/ansi/styles/index.ts"

// Layout system - CSS-inspired layout utilities
export * from "./core/view/layout/index.ts"

// CLI framework
export * from "./cli/index.ts"

// Process manager
export * from "./process-manager/index.ts"

// Built-in plugins
export * from "./plugins/index.ts"

// Logger
export * from "./logger/index.ts"

// Configuration system
export * from "./config/index.ts"

// Screenshot utilities (not yet implemented)
// export * from "./screenshot"

// Theming system (not yet implemented)
// export * from "./theming"

// Type Safety & Validation
export * from "./core/types/schemas.ts"
// export * from "./core/types/type-utils.ts" // TODO: File not found

// Version information
export const VERSION = "1.0.0-rc.3" as const

// Framework metadata
export const FRAMEWORK_INFO = {
  name: "tuix",
  version: VERSION,
  description: "A performant TUI framework for Bun with JSX and reactive state management",
  repository: "https://github.com/cinderlink/tuix",
  license: "MIT",
  features: {
    zodValidation: true,
    typeSafety: true,
    jsxRuntime: true,
    reactiveState: true
  }
} as const
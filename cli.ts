/**
 * CLI Framework Exports
 * 
 * Main entry point for the CLI framework functionality
 */

// CLI Framework Core
export { defineConfig, defineCommand, lazyLoad, commonOptions, commonArgs } from "./src/cli/config"
export { CLIParser } from "./src/cli/parser"
export { CLIRouter, CommandSuggestions } from "./src/cli/router"
export { CLIRunner, runCLI, cli } from "./src/cli/runner"
export { HelpGenerator } from "./src/cli/help"
export { lazyLoadCommand, lazyLoadPlugin, LazyCache, globalLazyCache } from "./src/cli/lazy"

export type {
  CLIConfig,
  CommandConfig,
  ParsedArgs,
  Handler,
  LazyHandler,
  Plugin,
  CLIContext,
  CLIHooks
} from "./src/cli/types"

// Simplified Component API for CLI UIs

// Component creation and reactivity
export {
  createComponent,
  functional,
  reactive
} from "./src/components/component"

export {
  $state,
  $derived,
  $effect
} from "./src/components/reactivity"

export {
  onMount,
  onDestroy
} from "./src/components/lifecycle"

// UI Components
export {
  Panel,
  HeaderPanel,
  InfoPanel,
  SuccessPanel,
  WarningPanel,
  ErrorPanel
} from "./src/components/builders/Panel"

export {
  Button as SimpleButton,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton
} from "./src/components/builders/Button"

// Core view functions
export {
  text,
  styledText,
  vstack,
  hstack
} from "./src/core/view"

// Styling
export {
  style,
  Colors
} from "./src/styling/index"
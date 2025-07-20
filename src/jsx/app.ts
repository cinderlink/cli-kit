/**
 * JSX App Wrapper
 * 
 * Simplified JSX-based app creation for tuix
 */

import { Effect, FiberRef } from "effect"
import { runApp } from "../core/runtime"
import { LiveServices } from "../services/impl/index"
import type { View } from "../core/types"
import { Interactive, InteractiveContextLive, InteractiveFiberRef } from "../core/interactive"
import { EventBus } from "../core/event-bus"

// Debug logging
const DEBUG = process.env.TUIX_DEBUG === 'true'
const debug = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[TUIX JSX] ${msg}`, ...args)
}


// Import JSX runtime for JSX syntax support
import { jsx as jsxFactory, JSXContext } from "./runtime"

// Re-export JSX context helpers for component development
export { JSXContext }

// Re-export runes for easy JSX development
export { $state, $bindable, $derived, $effect } from '../reactivity/runes'

// Re-export lifecycle hooks for component lifecycle management
export { 
  onMount, 
  onDestroy, 
  beforeUpdate, 
  afterUpdate, 
  tick,
  untrack,
  withLifecycle
} from '../reactivity/jsx-lifecycle'

// Export JSX components from their new modules
export { 
  CLI, 
  Plugin,
  Command, 
  Arg, 
  Flag,
  Option,
  Help,
  Example,
  Exit,
  LoadPlugin,
  CommandLineScope,
  CommandLineHelp
} from '../cli/jsx/components'

export {
  Scope,
  ScopeContent,
  ScopeFallback
} from '../scope/jsx/components'

// Plugin management components - handled by plugin module
export { 
  RegisterPlugin,
  EnablePlugin,
  ConfigurePlugin
} from '../plugins/jsx/components'

// UI Component exports
export const text = (props: any) => jsxFactory('text', props)
export const vstack = (props: any) => jsxFactory('vstack', props)
export const hstack = (props: any) => jsxFactory('hstack', props)
export const Box = (props: any) => jsxFactory('Box', props)
export const panel = (props: any) => jsxFactory('panel', props)
export const button = (props: any) => jsxFactory('button', props)
export const input = (props: any) => jsxFactory('input', props)

export interface JSXAppProps {
  children?: JSX.Element | JSX.Element[]
}

export interface JSXAppConfig {
  eventBus?: EventBus
  onInit?: () => void | Promise<void>
  onExit?: () => void | Promise<void>
}

// CLI-specific types moved to cli/jsx/types
export type {
  JSXCommandConfig,
  JSXArgConfig,
  JSXFlagConfig,
  JSXCommandHandler,
  JSXCommandContext,
  JSXPlugin
} from '../cli/jsx/types'

/**
 * Create and run a JSX-based tuix app
 */
export function createJSXApp(AppComponent: (() => JSX.Element) | JSX.Element, config?: JSXAppConfig & { interactive?: boolean | Partial<import('../core/interactive').InteractiveConfig> }): Promise<void> {
  debug('createJSXApp called')
  
  // Handle both function components and JSX elements
  const getAppElement = () => {
    try {
      if (typeof AppComponent === 'function') {
        const result = AppComponent()
        if (!result) {
          console.error('[render] ERROR: App component function returned null/undefined')
          // Return empty element as fallback
          return jsxFactory('vstack', { children: [] })
        }
        return result
      } else {
        if (!AppComponent) {
          console.error('[render] ERROR: App component is null/undefined')
          return jsxFactory('vstack', { children: [] })
        }
        return AppComponent
      }
    } catch (error) {
      console.error('[render] ERROR: Exception in getAppElement:', error)
      return jsxFactory('vstack', { children: [] })
    }
  }

  // Handle initialization
  if (config?.onInit) {
    const initResult = config.onInit()
    if (initResult instanceof Promise) {
      initResult.catch(console.error)
    }
  }

  // Create component wrapper
  const component = {
    init: Effect.succeed([{}, []] as const),
    update: () => Effect.succeed([{}, []] as const),
    view: getAppElement,
    subscription: () => Effect.succeed([])
  }

  // Handle exit cleanup
  const cleanup = () => {
    if (config?.onExit) {
      const exitResult = config.onExit()
      if (exitResult instanceof Promise) {
        exitResult.catch(console.error)
      }
    }
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // Run the app
  debug('Running app...')
  return Effect.runPromise(
    Effect.gen(function* () {
      // Check if we're already in an interactive context (e.g., from a command)
      const isAlreadyInteractive = yield* FiberRef.get(InteractiveFiberRef)
      debug(`Is already interactive: ${isAlreadyInteractive}`)
      
      if (isAlreadyInteractive) {
        debug('Already in interactive context, running app with event loop')
        // We're already in an interactive context, just run the app normally
        yield* runApp(component).pipe(
          Effect.catchAll(() => Effect.void)
        )
      } else {
        debug('Not in interactive context, rendering once and exiting')
        // We're not in an interactive context, so render once and exit
        const view = getAppElement()
        debug('Got app element:', view)
        debug('App element type:', typeof view)
        debug('App element keys:', view ? Object.keys(view) : 'null/undefined')
        if (!view) {
          console.error('ERROR: getAppElement() returned null/undefined')
          console.error('This usually means the JSX component returned nothing')
        }
        const { renderToTerminal } = yield* Effect.promise(() => import('./render'))
        yield* Effect.promise(() => renderToTerminal(view))
        debug('Finished rendering')
        // Explicitly exit since we're done
        process.exit(0)
      }
    }).pipe(
      Effect.provide(InteractiveContextLive),
      Effect.provide(LiveServices),
      Effect.orDie
    )
  ).finally(cleanup)
}

// CLI-specific functions moved to cli/jsx/app
// CLI-specific functions moved to cli/jsx/app
export { defineJSXCommand, jsxCommand } from '../cli/jsx/app'

/**
 * Simple wrapper for single-component apps
 * Automatically detects CLI commands and delegates to appropriate runner
 */
// Guard against multiple render calls
let renderInProgress = false

export function render(AppComponent: (() => JSX.Element) | JSX.Element): Promise<void> {
  debug('render() called')
  
  if (renderInProgress) {
    console.error('[render] ERROR: render() called while already rendering!')
    console.error('[render] This usually indicates a problem with the app structure')
    return Promise.resolve()
  }
  renderInProgress = true
  
  // First, check if this is a CLI app by looking for CLI commands
  const { hasCliCommands } = require('../cli/jsx/stores')
  const { runCLIApp } = require('../cli/jsx/app')
  
  // Process the component once to trigger scope registrations
  const element = typeof AppComponent === 'function' ? AppComponent() : AppComponent
  
  // Check if we have CLI commands registered
  if (hasCliCommands()) {
    debug('CLI commands detected, delegating to runCLIApp')
    return runCLIApp(AppComponent).finally(() => {
      renderInProgress = false
    })
  }
  
  // Otherwise run as regular app
  debug('No CLI commands detected, running as regular app')
  return createJSXApp(AppComponent).finally(() => {
    renderInProgress = false
  })
}

// Plugin creation moved to plugin module
export { createJSXPlugin } from '../plugins/jsx/app'

// CLI-specific runners moved to cli/jsx/app
export { runJSXCLI } from '../cli/jsx/app'
// All CLI-specific implementation has been moved to cli/jsx/app module

/**
 * Re-export JSX intrinsic element types for better developer experience
 * These are used as JSX elements and don't need to be imported, but having
 * the types available can be helpful
 */
export type {
  StreamProps as Stream,
  PipeProps as Pipe,
  TransformProps as Transform,
  StreamBoxProps as StreamBox,
  SpawnProps as Spawn,
  ManagedSpawnProps as ManagedSpawn,
  CommandPipelineProps as CommandPipeline
} from "./runtime"

// CLI-specific types are exported from CLI module
export type {
  CLIProps as CLI,
  PluginProps as Plugin,
  CommandProps as Command,
  ArgProps as Arg,
  FlagProps as Flag,
  HelpProps as Help,
  ExampleProps as Example,
  LoadPluginProps as LoadPlugin
} from "../cli/jsx/types"

// Plugin-specific types are exported from plugin module
export type {
  RegisterPluginProps as RegisterPlugin,
  EnablePluginProps as EnablePlugin,
  ConfigurePluginProps as ConfigurePlugin
} from "../plugins/jsx/types"

/**
 * Default export for convenience
 */
export default render

// Also export as jsx for JSX runtime compatibility
export { render as jsx }
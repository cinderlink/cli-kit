/**
 * JSX App Wrapper
 * 
 * Simplified JSX-based app creation for tuix
 */

import { Effect, FiberRef } from "effect"
import { runApp } from "@core/runtime/mvu/runtime"
import { LiveServices } from "@core/services/impl"
import type { View } from "@core/types"
import { Interactive, InteractiveContextLive, InteractiveFiberRef } from "@core/runtime/interactive"
import { EventBus } from "@core/model/events/eventBus"

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
export { $state, $bindable, $derived, $effect } from '@core/update/reactivity/runes'

// Re-export lifecycle hooks for component lifecycle management
export { 
  onMount, 
  onDestroy, 
  beforeUpdate, 
  afterUpdate, 
  tick,
  untrack,
  withLifecycle
} from '@core/update/reactivity/jsxLifecycle'

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
} from '@cli/jsx/components'

export {
  Scope,
  ScopeContent,
  ScopeFallback
} from '@core/model/scope/jsx/components'

// Plugin management components - handled by plugin module
export { 
  RegisterPlugin,
  EnablePlugin,
  ConfigurePlugin
} from '@plugins/api/jsx/components'

/**
 * Create a text element for displaying strings in the terminal
 * 
 * @param props - Text properties including content and styling
 * @returns A View that renders the text content
 * 
 * @example
 * ```tsx
 * const greeting = text({ children: 'Hello World' })
 * ```
 */
export const text = (props: any) => jsxFactory('text', props)

/**
 * Create a vertical stack layout container
 * 
 * Arranges child elements vertically with optional gap and alignment.
 * 
 * @param props - Vertical stack properties
 * @param props.children - Child elements to stack vertically
 * @param props.gap - Space between children (optional)
 * @param props.align - Horizontal alignment: 'left', 'center', 'right' (optional)
 * @returns A View that renders children in a vertical layout
 * 
 * @example
 * ```tsx
 * const stack = vstack({ 
 *   gap: 1, 
 *   align: 'center',
 *   children: [text('Line 1'), text('Line 2')] 
 * })
 * ```
 */
export const vstack = (props: any) => jsxFactory('vstack', props)

/**
 * Create a horizontal stack layout container
 * 
 * Arranges child elements horizontally with optional gap and alignment.
 * 
 * @param props - Horizontal stack properties
 * @param props.children - Child elements to stack horizontally
 * @param props.gap - Space between children (optional)
 * @param props.align - Vertical alignment: 'top', 'middle', 'bottom' (optional)
 * @returns A View that renders children in a horizontal layout
 * 
 * @example
 * ```tsx
 * const stack = hstack({ 
 *   gap: 2, 
 *   align: 'middle',
 *   children: [text('Left'), text('Right')] 
 * })
 * ```
 */
export const hstack = (props: any) => jsxFactory('hstack', props)

/**
 * Create a box container with styling and layout properties
 * 
 * Provides a flexible container with padding, margins, borders, and background styling.
 * 
 * @param props - Box properties including styling and content
 * @param props.children - Child elements contained within the box
 * @returns A View that renders a styled box container
 * 
 * @example
 * ```tsx
 * const styledBox = Box({ 
 *   style: { padding: 1, border: 'single' },
 *   children: text('Boxed content') 
 * })
 * ```
 */
export const Box = (props: any) => jsxFactory('Box', props)

/**
 * Create a panel component with title and content areas
 * 
 * Provides a titled container typically used for grouping related content.
 * 
 * @param props - Panel properties
 * @param props.title - Panel title (optional)
 * @param props.children - Panel content
 * @returns A View that renders a panel with optional title
 * 
 * @example
 * ```tsx
 * const infoPanel = panel({ 
 *   title: 'Information',
 *   children: text('Panel content here') 
 * })
 * ```
 */
export const panel = (props: any) => jsxFactory('panel', props)

/**
 * Create an interactive button component
 * 
 * Provides a clickable button element that can handle user interactions.
 * 
 * @param props - Button properties
 * @param props.children - Button label/content
 * @param props.onClick - Click handler function (optional)
 * @returns A View that renders an interactive button
 * 
 * @example
 * ```tsx
 * const submitButton = button({ 
 *   onClick: () => console.log('Clicked!'),
 *   children: 'Submit' 
 * })
 * ```
 */
export const button = (props: any) => jsxFactory('button', props)

/**
 * Create an input field component for user text entry
 * 
 * Provides a text input field that accepts user keyboard input.
 * 
 * @param props - Input properties
 * @param props.value - Current input value (optional)
 * @param props.placeholder - Placeholder text (optional)
 * @param props.onChange - Change handler function (optional)
 * @returns A View that renders an interactive input field
 * 
 * @example
 * ```tsx
 * const nameInput = input({ 
 *   placeholder: 'Enter your name',
 *   onChange: (value) => console.log('Input:', value) 
 * })
 * ```
 */
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
} from '@cli/jsx/types'

/**
 * Create and run a JSX-based tuix application
 * 
 * Sets up and runs a complete tuix application with the provided JSX component.
 * Handles both function components and JSX elements, with support for interactive
 * and non-interactive modes.
 * 
 * @param AppComponent - The root JSX component (function or element)
 * @param config - Optional application configuration
 * @param config.eventBus - Custom event bus instance
 * @param config.onInit - Initialization callback
 * @param config.onExit - Cleanup callback
 * @param config.interactive - Enable interactive mode with event loop
 * @returns Promise that resolves when the app completes
 * 
 * @example Simple JSX app:
 * ```tsx
 * const MyApp = () => (
 *   <vstack>
 *     <text>Welcome to my app!</text>
 *     <button onClick={() => process.exit(0)}>Exit</button>
 *   </vstack>
 * )
 * 
 * await createJSXApp(MyApp)
 * ```
 * 
 * @example MVU-style JSX app:
 * ```tsx
 * type Model = { count: number }
 * type Msg = { type: 'increment' } | { type: 'decrement' }
 * 
 * function Counter({ model, dispatch }: { model: Model; dispatch: (msg: Msg) => void }) {
 *   return (
 *     <vstack>
 *       <text>Count: {model.count}</text>
 *       <hstack>
 *         <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
 *         <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *       </hstack>
 *     </vstack>
 *   )
 * }
 * 
 * await createJSXApp({
 *   init: () => [{ count: 0 }, []],
 *   update: (msg, model) => {
 *     switch (msg.type) {
 *       case 'increment': return [{ ...model, count: model.count + 1 }, []]
 *       case 'decrement': return [{ ...model, count: model.count - 1 }, []]
 *     }
 *   },
 *   view: Counter
 * })
 * ```
 * 
 * @throws Error if the component returns null/undefined or fails to render
 */
export function createJSXApp(AppComponent: (() => JSX.Element) | JSX.Element, config?: JSXAppConfig & { interactive?: boolean | Partial<import('../core/interactive').InteractiveConfig> }): Promise<void>
export function createJSXApp<Model, Msg>(config: {
  init: () => [Model, import('@core/types').Cmd<Msg>[]]
  update: (msg: Msg, model: Model) => [Model, import('@core/types').Cmd<Msg>[]]
  view: (props: { model: Model, dispatch: (msg: Msg) => void }) => JSX.Element
  subscriptions?: (model: Model) => Effect<import('@core/types').Sub<Msg>, never, import('@core/types').AppServices>
}): Promise<void>
export function createJSXApp<Model = {}, Msg = never>(
  configOrComponent: (() => JSX.Element) | JSX.Element | {
    init: () => [Model, import('@core/types').Cmd<Msg>[]]
    update: (msg: Msg, model: Model) => [Model, import('@core/types').Cmd<Msg>[]]
    view: (props: { model: Model, dispatch: (msg: Msg) => void }) => JSX.Element
    subscriptions?: (model: Model) => Effect<import('@core/types').Sub<Msg>, never, import('@core/types').AppServices>
  },
  config?: JSXAppConfig & { interactive?: boolean | Partial<import('../core/interactive').InteractiveConfig> }
): Promise<void> {
  debug('createJSXApp called')
  
  // Check if we have an MVU config
  if (typeof configOrComponent === 'object' && 'init' in configOrComponent && 'update' in configOrComponent && 'view' in configOrComponent) {
    // MVU-style app
    const mvuConfig = configOrComponent
    
    // Store the dispatch function so view can access it
    let currentDispatch: ((msg: Msg) => void) | null = null
    
    // Create proper MVU component
    let component: import('@core/types').Component<Model, Msg> = {
      init: () => Effect.map(
        Effect.succeed(mvuConfig.init()),
        ([model, effects]) => [model, effects.map(eff => eff as import('@core/types').Cmd<Msg>)]
      ),
      update: (msg, model) => Effect.map(
        Effect.succeed(mvuConfig.update(msg, model)),
        ([newModel, effects]) => [newModel, effects.map(eff => eff as import('@core/types').Cmd<Msg>)]
      ),
      view: (model) => {
        const element = mvuConfig.view({ 
          model, 
          dispatch: currentDispatch || (() => {
            console.warn('Dispatch called before initialization')
          })
        })
        return element as import('@core/types').View
      },
      subscriptions: mvuConfig.subscriptions
    }
    
    // Wrap with debug if enabled
    if (process.env.TUIX_DEBUG === 'true') {
      const { enableDebugIfNeeded } = require('../debug/mvu/integration')
      component = enableDebugIfNeeded(component)
    }
    
    // Run the MVU app
    return Effect.runPromise(
      runApp(component).pipe(
        Effect.provide(LiveServices),
        Effect.orDie
      )
    )
  }
  
  // Simple JSX component
  const AppComponent = configOrComponent as (() => JSX.Element) | JSX.Element
  
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

  // Create MVU component from JSX app
  const component: import('@core/types').Component<{}, never> = {
    init: Effect.succeed([{}, []]),
    update: (_msg, model) => Effect.succeed([model, []]),
    view: (_model) => {
      const element = getAppElement()
      // JSX elements are already Views, so we can return them directly
      return element as import('@core/types').View
    },
    subscriptions: undefined // No subscriptions for simple JSX apps
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
        const { renderToTerminal } = yield* Effect.promise(() => import('./impl/render'))
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
export { defineJSXCommand, jsxCommand } from '@cli/jsx/app'

/**
 * Simple wrapper for single-component apps
 * Automatically detects CLI commands and delegates to appropriate runner
 */
// Guard against multiple render calls and runaway renders
let renderInProgress = false
let renderCount = 0
let lastRenderTime = 0
const MAX_FPS = 120
const MAX_TOTAL_RENDERS = 100
const RENDER_RESET_INTERVAL = 1000

/**
 * Render a JSX application component
 * 
 * Smart rendering function that automatically detects whether the app contains
 * CLI commands and delegates to the appropriate runner. For CLI apps, it uses
 * runCLIApp; for regular apps, it uses createJSXApp.
 * 
 * @param AppComponent - The root JSX component (function or element)
 * @returns Promise that resolves when rendering completes
 * 
 * @example
 * ```tsx
 * // Regular UI app
 * const MyApp = () => <text>Hello World</text>
 * await render(MyApp)
 * 
 * // CLI app (automatically detected)
 * const MyCLI = () => (
 *   <cli name="myapp">
 *     <command name="hello" handler={() => console.log('Hello!')}>
 *       Say hello
 *     </command>
 *   </cli>
 * )
 * await render(MyCLI)
 * ```
 * 
 * @throws Error if render is called while already rendering (prevents recursion)
 */
export function render(AppComponent: (() => JSX.Element) | JSX.Element): Promise<void> {
  debug('render() called')
  
  const now = Date.now()
  
  // Reset render count if enough time has passed
  if (now - lastRenderTime > RENDER_RESET_INTERVAL) {
    renderCount = 0
  }
  lastRenderTime = now
  
  // Check for concurrent render calls
  if (renderInProgress) {
    console.error('[render] ERROR: render() called while already rendering!')
    console.error('[render] This usually indicates a problem with the app structure')
    return Promise.resolve()
  }
  
  // Check for runaway renders
  renderCount++
  if (renderCount > MAX_FPS) {
    console.error(`[render] ERROR: Too many render calls (${renderCount}) in short time period!`)
    console.error('[render] This indicates a runaway render loop - terminating to prevent system hang')
    console.error('[render] The app will now forcefully exit')
    process.exit(1)
  }
  
  if (renderCount > MAX_TOTAL_RENDERS) {
    console.error(`[render] ERROR: Maximum render calls (${MAX_TOTAL_RENDERS}) exceeded!`)
    console.error('[render] This indicates a severe runaway render issue - terminating immediately')
    process.exit(1)
  }
  
  renderInProgress = true
  
  // First, check if this is a CLI app by looking for CLI commands
  const { hasCliCommands } = require('../cli/jsx/stores')
  const { runCLIApp } = require('../cli/jsx/app')
  
  // Process the component once to trigger scope registrations
  const element = typeof AppComponent === 'function' ? AppComponent() : AppComponent
  
  // Wrap in debug if enabled
  let finalComponent = AppComponent
  if (process.env.TUIX_DEBUG === 'true' && process.env.TUIX_DEBUG_AUTO_WRAP !== 'false') {
    debug('Debug mode enabled, wrapping component')
    try {
      const { DebugWrapper } = require('./debug/wrapper')
      finalComponent = () => DebugWrapper({ children: typeof AppComponent === 'function' ? AppComponent() : AppComponent })
    } catch (error) {
      debug('Failed to load debug wrapper:', error)
    }
  }
  
  // Check if we have CLI commands registered
  if (hasCliCommands()) {
    debug('CLI commands detected, delegating to runCLIApp')
    return runCLIApp(finalComponent).finally(() => {
      renderInProgress = false
    })
  }
  
  // Otherwise run as regular app
  debug('No CLI commands detected, running as regular app')
  return createJSXApp(finalComponent).finally(() => {
    renderInProgress = false
  })
}

// Plugin creation moved to plugin module
export { createJSXPlugin } from '@plugins/api/jsx/app'

// CLI-specific runners moved to cli/jsx/app
export { runJSXCLI } from '@cli/jsx/app'
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
} from "@cli/jsx/types"

// Plugin-specific types are exported from plugin module
export type {
  RegisterPluginProps as RegisterPlugin,
  EnablePluginProps as EnablePlugin,
  ConfigurePluginProps as ConfigurePlugin
} from "@plugins/api/jsx/types"

/**
 * Default export for convenience
 */
export default render

// Also export as jsx for JSX runtime compatibility
export { render as jsx }
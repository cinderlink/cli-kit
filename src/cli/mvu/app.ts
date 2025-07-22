/**
 * CLI MVU App
 * 
 * Integrates the unified state management with the JSX app system
 */

import { Effect } from "effect"
import type { Component } from "@core/types"
import { initAppModel, type AppModel, type AppMsg, type Cmd } from "./model"
import { update } from "./update"
import { CLIStoreAdapter, CommandStoreAdapter, PluginStoreAdapter } from "./storeAdapter"
import { withComponentContext } from "@jsx/context"

// Global state for store adapters
let currentModel: AppModel = initAppModel()
let currentDispatch: ((msg: AppMsg) => void) | null = null

// Store context for adapters
const storeContext = {
  getModel: () => currentModel,
  dispatch: (msg: AppMsg) => {
    if (currentDispatch) {
      currentDispatch(msg)
    } else {
      console.warn('Store dispatch called before MVU app initialization')
    }
  }
}

// Create singleton store adapters
export const cliStore = new CLIStoreAdapter(storeContext)
export const commandStore = new CommandStoreAdapter(storeContext)
export const pluginStore = new PluginStoreAdapter(storeContext)

/**
 * Create a CLI MVU component
 * 
 * This wraps a view function with the unified state management
 */
export function createCLIMVUComponent(
  view: (props: { model: AppModel; dispatch: (msg: AppMsg) => void }) => JSX.Element
): Component<AppModel, AppMsg> {
  return {
    init: Effect.succeed([initAppModel(), []]),
    
    update: (msg, model) => {
      const [newModel, cmds] = update(msg, model)
      
      // Update global model reference
      currentModel = newModel
      
      // Convert commands to Effects
      const effects = cmds.map(cmd => 
        cmd.pipe(
          Effect.map(resultMsg => resultMsg),
          Effect.catchAll(() => Effect.succeed(null as any)),
          Effect.filterOrFail(msg => msg !== null)
        )
      )
      
      return Effect.succeed([newModel, effects as Cmd[]])
    },
    
    view: (model) => {
      // Update global model reference
      currentModel = model
      
      // Create dispatch function
      const dispatch = (msg: AppMsg) => {
        if (currentDispatch) {
          currentDispatch(msg)
        }
      }
      
      // Provide context and render view
      const element = withComponentContext(
        { model, dispatch },
        () => view({ model, dispatch })
      )
      
      return element as any
    },
    
    subscriptions: undefined
  }
}

/**
 * Hook to set the dispatch function
 * Called by the MVU runtime during initialization
 */
export function setDispatch(dispatch: (msg: AppMsg) => void) {
  currentDispatch = dispatch
}

/**
 * Get current model (for debugging)
 */
export function getCurrentModel(): AppModel {
  return currentModel
}

/**
 * Migration helpers for existing code
 */

// Re-export types that existing code might depend on
export type { CLIAppOptions } from "@cli/jsx/app"
export type { JSXCommandContext } from "@cli/jsx/types"
export type { Plugin } from "@cli/plugin"
export type { RegisteredPlugin } from "./model"

// Helper to check if a command has CLI commands
export function hasCliCommands(): boolean {
  const cliScope = commandStore.getCLIScope()
  if (!cliScope) return false
  
  const commands = commandStore.getSubcommands([])
  return commands.length > 0
}
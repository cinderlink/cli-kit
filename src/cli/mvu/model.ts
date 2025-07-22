/**
 * Unified CLI State Model
 * 
 * Consolidates all CLI-related state into a single MVU model
 */

import { Effect } from "effect"
import type { Plugin } from "@cli/plugin"
import type { ScopeDef } from "@core/model/scope/types"
import type { CLIAppOptions } from "@cli/jsx/app"
import type { JSXCommandContext } from "@cli/jsx/types"

// CLI State
export interface CLIState {
  config: CLIAppOptions
  isRunning: boolean
  exitCode: number | null
}

// Command Registry State
export interface CommandRegistry {
  activePath: string[]
  context: JSXCommandContext | null
  // Note: Actual commands are stored in scope system
}

// Plugin Registry State
export interface PluginRegistry {
  plugins: Map<string, RegisteredPlugin>
  autoEnable: boolean
  validateDependencies: boolean
}

export interface RegisteredPlugin {
  plugin: Plugin
  enabled: boolean
  loadTime: Date
  dependencies: string[]
  dependents: string[]
  config?: Record<string, unknown>
}

// Debug State (reuse from debug integration)
export interface DebugState {
  activeTab: string
  logs: string[]
  output: string[]
  events: Array<{ timestamp: number; type: string; data: any }>
  isVisible: boolean
  performance: {
    renderCount: number
    lastRenderTime: number
    avgRenderTime: number
  }
}

// Unified App Model
export interface AppModel {
  cli: CLIState
  commands: CommandRegistry
  plugins: PluginRegistry
  debug: DebugState
}

// App Messages
export type AppMsg =
  // CLI Messages
  | { type: "SetCLIConfig"; config: CLIAppOptions }
  | { type: "StartCLI" }
  | { type: "StopCLI"; exitCode: number }
  | { type: "ResetCLI" }
  
  // Command Messages
  | { type: "SetCommandPath"; path: string[] }
  | { type: "ExecuteCommand"; path: string[]; context: JSXCommandContext }
  | { type: "ResetCommandContext" }
  
  // Plugin Messages
  | { type: "RegisterPlugin"; plugin: Plugin; config?: Record<string, unknown> }
  | { type: "EnablePlugin"; name: string }
  | { type: "DisablePlugin"; name: string }
  | { type: "ConfigurePlugin"; name: string; config: Record<string, unknown> }
  | { type: "UnregisterPlugin"; name: string }
  
  // Debug Messages
  | { type: "UpdateDebugTab"; tab: string }
  | { type: "ToggleDebugVisibility" }
  | { type: "AddDebugLog"; message: string }
  | { type: "AddDebugOutput"; content: string }
  | { type: "RecordDebugEvent"; event: string; data: any }
  | { type: "UpdateDebugPerformance"; renderTime: number }

// Commands (Effects)
export type Cmd = Effect.Effect<AppMsg, never, never>

// Initialize default model
export const initAppModel = (): AppModel => ({
  cli: {
    config: {},
    isRunning: false,
    exitCode: null
  },
  commands: {
    activePath: [],
    context: null
  },
  plugins: {
    plugins: new Map(),
    autoEnable: true,
    validateDependencies: true
  },
  debug: {
    activeTab: "app",
    logs: [],
    output: [],
    events: [],
    isVisible: false,
    performance: {
      renderCount: 0,
      lastRenderTime: 0,
      avgRenderTime: 0
    }
  }
})
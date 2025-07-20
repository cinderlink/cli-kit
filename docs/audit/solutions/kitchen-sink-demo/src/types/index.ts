/**
 * Type Definitions
 * 
 * Central type definitions for the kitchen sink demo.
 */

// Command types
export interface CommandContext {
  args: Record<string, any>
  flags: Record<string, any>
  config: any
}

// Component props types
export interface ViewProps {
  className?: string
  style?: string
}

// Transform types
export interface Transform<TInput, TOutput> {
  name: string
  transform: (input: TInput) => Promise<TOutput> | TOutput
}

// Plugin types
export interface PluginMeta {
  name: string
  version: string
  description?: string
}

// State types
export interface AppState {
  theme: 'dark' | 'light'
  debug: boolean
  [key: string]: any
}

// Event types
export interface KeyEvent {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export interface MouseEvent {
  x: number
  y: number
  button: 'left' | 'right' | 'middle'
  type: 'click' | 'move' | 'scroll'
}

// Service types (simplified)
export interface Logger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
  debug: (message: string) => void
}

export interface ProcessManager {
  list: () => Process[]
  start: (command: string) => Process
  stop: (id: string) => void
  restart: (id: string) => void
}

export interface Process {
  id: string
  command: string
  status: 'running' | 'stopped' | 'error'
  pid?: number
  startTime?: Date
  cpu?: number
  memory?: number
}
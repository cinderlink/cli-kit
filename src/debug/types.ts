/**
 * Debug Module Type Definitions
 */

export interface RenderTreeNode {
  id: string
  type: string
  props: Record<string, unknown>
  children: RenderTreeNode[]
  depth: number
}

export interface DebugEvent {
  id: string
  timestamp: Date
  category:
    | 'scope'
    | 'jsx'
    | 'render'
    | 'lifecycle'
    | 'match'
    | 'performance'
    | 'error'
    | 'system'
    | 'logger'
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
  context?: {
    scopeId?: string
    componentName?: string
    phase?: string
    duration?: number
    stack?: string
    source?: string
  }
}

export interface DebugState {
  events: DebugEvent[]
  paused: boolean
  filter: string
  selectedEvent: string | null
  selectedScope: string | null
  commandPath: string[]
  matchedScopes: string[]
  renderTree: RenderTreeNode[]
  performanceMetrics: Map<string, PerformanceMetric>
  maxEvents: number
}

export interface PerformanceMetric {
  name: string
  count: number
  totalTime: number
  minTime: number
  maxTime: number
  avgTime: number
}

export interface DebugConfig {
  enabled: boolean
  maxEvents: number
  captureLogger: boolean
  capturePerformance: boolean
  autoWrap: boolean
}

export type DebugTab = 'scopes' | 'events' | 'performance' | 'state'

export interface DebugHooks {
  useDebugState: () => DebugState
  useDebugEvents: (category?: DebugEvent['category']) => DebugEvent[]
  useDebugMetrics: () => PerformanceMetric[]
  useDebugControl: () => {
    pause: () => void
    resume: () => void
    clear: () => void
  }
}

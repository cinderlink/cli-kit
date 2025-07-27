/**
 * Debug Store - Core state management
 */

import { Effect } from 'effect'
import type { DebugEvent, DebugState, PerformanceMetric, RenderTreeNode } from '../types'
import { DEBUG_DEFAULTS, DEBUG_CATEGORIES, DEBUG_LEVELS } from '../constants'

class DebugStore {
  private state: DebugState = {
    events: [],
    paused: false,
    filter: '',
    selectedEvent: null,
    selectedScope: null,
    commandPath: process.argv.slice(2).filter(arg => !arg.startsWith('-')),
    matchedScopes: [],
    renderTree: [],
    performanceMetrics: new Map(),
    maxEvents: DEBUG_DEFAULTS.MAX_EVENTS
  }
  
  private listeners = new Set<() => void>()
  private eventIdCounter = 0
  
  getState(): DebugState {
    return this.state
  }
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  private notify() {
    this.listeners.forEach(listener => listener())
  }
  
  log(
    category: DebugEvent['category'],
    level: DebugEvent['level'],
    message: string,
    data?: unknown,
    context?: DebugEvent['context']
  ) {
    if (this.state.paused && category !== DEBUG_CATEGORIES.SYSTEM) return
    
    const event: DebugEvent = {
      id: `event_${++this.eventIdCounter}`,
      timestamp: new Date(),
      category,
      level,
      message,
      data,
      context
    }
    
    this.state.events.push(event)
    
    // Update performance metrics if applicable
    if (category === DEBUG_CATEGORIES.PERFORMANCE && context?.duration !== undefined) {
      this.updatePerformanceMetrics(context.componentName || message, context.duration)
    }
    
    // Keep only last N events
    if (this.state.events.length > this.state.maxEvents) {
      this.state.events = this.state.events.slice(-this.state.maxEvents)
    }
    
    this.notify()
  }
  
  private updatePerformanceMetrics(name: string, duration: number) {
    const existing = this.state.performanceMetrics.get(name)
    
    if (existing) {
      existing.count++
      existing.totalTime += duration
      existing.minTime = Math.min(existing.minTime, duration)
      existing.maxTime = Math.max(existing.maxTime, duration)
      existing.avgTime = existing.totalTime / existing.count
    } else {
      this.state.performanceMetrics.set(name, {
        name,
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        avgTime: duration
      })
    }
  }
  
  setPaused(paused: boolean) {
    this.state.paused = paused
    this.log(DEBUG_CATEGORIES.SYSTEM, DEBUG_LEVELS.INFO, paused ? 'Debug recording paused' : 'Debug recording resumed')
    this.notify()
  }
  
  setFilter(filter: string) {
    this.state.filter = filter
    this.notify()
  }
  
  setSelectedEvent(eventId: string | null) {
    this.state.selectedEvent = eventId
    this.notify()
  }
  
  setSelectedScope(scopeId: string | null) {
    this.state.selectedScope = scopeId
    this.notify()
  }
  
  setMatchedScopes(scopeIds: string[]) {
    this.state.matchedScopes = scopeIds
    this.notify()
  }
  
  updateRenderTree(tree: RenderTreeNode[]) {
    this.state.renderTree = tree
    this.notify()
  }
  
  clear() {
    this.state.events = []
    this.state.performanceMetrics.clear()
    this.state.selectedEvent = null
    this.log(DEBUG_CATEGORIES.SYSTEM, DEBUG_LEVELS.INFO, 'Debug events cleared')
    this.notify()
  }
  
  getFilteredEvents(): DebugEvent[] {
    if (!this.state.filter) return this.state.events
    
    const filter = this.state.filter.toLowerCase()
    return this.state.events.filter(event => 
      event.message.toLowerCase().includes(filter) ||
      event.category.includes(filter) ||
      event.level.includes(filter) ||
      (event.context?.componentName?.toLowerCase().includes(filter)) ||
      (event.data ? JSON.stringify(event.data).toLowerCase().includes(filter) : false)
    )
  }
  
  getEventsByCategory(category: DebugEvent['category']): DebugEvent[] {
    return this.state.events.filter(e => e.category === category)
  }
  
  getPerformanceReport(): PerformanceMetric[] {
    return Array.from(this.state.performanceMetrics.values())
      .sort((a, b) => b.totalTime - a.totalTime)
  }
}

// Global instance
export const debugStore = new DebugStore()

// Convenience logging functions
export const debug = {
  scope: (message: string, data?: unknown) => 
    debugStore.log(DEBUG_CATEGORIES.SCOPE, DEBUG_LEVELS.DEBUG, message, data),
  
  jsx: (message: string, data?: unknown) => 
    debugStore.log(DEBUG_CATEGORIES.JSX, DEBUG_LEVELS.DEBUG, message, data),
  
  render: (message: string, context?: { componentName?: string, phase?: string }) => 
    debugStore.log(DEBUG_CATEGORIES.RENDER, DEBUG_LEVELS.DEBUG, message, undefined, context),
  
  lifecycle: (message: string, context?: { componentName?: string, phase?: string }) => 
    debugStore.log(DEBUG_CATEGORIES.LIFECYCLE, DEBUG_LEVELS.DEBUG, message, undefined, context),
  
  match: (message: string, data?: unknown) => 
    debugStore.log(DEBUG_CATEGORIES.MATCH, DEBUG_LEVELS.INFO, message, data),
  
  performance: (message: string, duration: number, context?: { componentName?: string }) => 
    debugStore.log(DEBUG_CATEGORIES.PERFORMANCE, DEBUG_LEVELS.DEBUG, message, undefined, { ...context, duration }),
  
  error: (message: string, error?: Error) => 
    debugStore.log(DEBUG_CATEGORIES.ERROR, DEBUG_LEVELS.ERROR, message, error, { stack: error?.stack }),
  
  system: (message: string) => 
    debugStore.log(DEBUG_CATEGORIES.SYSTEM, DEBUG_LEVELS.INFO, message),
  
  logger: (message: string, data?: unknown, context?: { source?: string }) => 
    debugStore.log(DEBUG_CATEGORIES.LOGGER, DEBUG_LEVELS.DEBUG, message, data, context)
}
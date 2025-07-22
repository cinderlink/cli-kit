/**
 * JSX Debug Module
 * 
 * Provides debug wrapper and extensibility for JSX applications
 */

export { DebugWrapper } from './DebugWrapper'

// Global debug tab registry for plugins
export interface DebugTabRegistration {
  id: string
  name: string
  component: () => any
  order?: number
}

const debugTabs: DebugTabRegistration[] = []

/**
 * Register a custom debug tab
 * Plugins can use this to add their own debug views
 */
export function registerDebugTab(tab: DebugTabRegistration) {
  debugTabs.push(tab)
  // Sort by order
  debugTabs.sort((a, b) => (a.order || 999) - (b.order || 999))
}

/**
 * Get all registered debug tabs
 */
export function getDebugTabs(): DebugTabRegistration[] {
  return [...debugTabs]
}

/**
 * Remove a debug tab
 */
export function unregisterDebugTab(id: string) {
  const index = debugTabs.findIndex(tab => tab.id === id)
  if (index >= 0) {
    debugTabs.splice(index, 1)
  }
}
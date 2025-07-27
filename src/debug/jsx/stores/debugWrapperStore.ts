/**
 * Debug Wrapper Store
 * 
 * Manages state for the debug wrapper component including tabs, logs, and output
 */

import { $state, $derived, $effect } from '@core/update/reactivity/runes'
import type { DebugTab } from '../../types'

// Extended tab types for new views
export type ExtendedDebugTab = DebugTab | 'logs' | 'output' | 'app'

export interface DebugWrapperState {
  activeTab: ExtendedDebugTab
  isVisible: boolean
  logs: string[]
  output: string[]
}

class DebugWrapperStore {
  // Core state
  #activeTab = $state<ExtendedDebugTab>('app')
  #isVisible = $state(true)
  #logs = $state<string[]>([])
  #output = $state<string[]>([])

  // Derived state
  #logCount = $derived(() => this.#logs.length)
  #outputCount = $derived(() => this.#output.length)

  // Getters
  get activeTab() { return this.#activeTab }
  get isVisible() { return this.#isVisible }
  get logs() { return this.#logs }
  get output() { return this.#output }
  get logCount() { return this.#logCount }
  get outputCount() { return this.#outputCount }

  // Actions
  setActiveTab(tab: ExtendedDebugTab) {
    this.#activeTab = tab
  }

  toggleVisibility() {
    this.#isVisible = !this.#isVisible
  }

  setVisibility(visible: boolean) {
    this.#isVisible = visible
  }

  addLog(message: string) {
    this.#logs = [...this.#logs, message]
  }

  addOutput(message: string) {
    this.#output = [...this.#output, message]
  }

  clearLogs() {
    this.#logs = []
  }

  clearOutput() {
    this.#output = []
  }

  clearCurrentView() {
    if (this.#activeTab === 'logs') {
      this.clearLogs()
    } else if (this.#activeTab === 'output') {
      this.clearOutput()
    }
  }

  // Get recent logs for display
  getRecentLogs(count = 20): string[] {
    return this.#logs.slice(-count)
  }

  // Get recent output for display
  getRecentOutput(count = 20): string[] {
    const fullOutput = this.#output.join('')
    const lines = fullOutput.split('\n')
    return lines.slice(-count)
  }

  // Handle keyboard input
  handleKeypress(key: string) {
    switch (key) {
      case 'd':
      case 'D':
        this.toggleVisibility()
        break
      case '1':
        this.setActiveTab('app')
        break
      case '2':
        this.setActiveTab('logs')
        break
      case '3':
        this.setActiveTab('output')
        break
      case '4':
        this.setActiveTab('scopes')
        break
      case '5':
        this.setActiveTab('events')
        break
      case '6':
        this.setActiveTab('performance')
        break
      case '7':
        this.setActiveTab('state')
        break
      case 'c':
      case 'C':
        this.clearCurrentView()
        break
      default:
        // Return false to indicate key wasn't handled
        return false
    }
    return true
  }

  // Tab display helpers
  getTabDisplay(tab: ExtendedDebugTab): string {
    const isActive = this.#activeTab === tab
    const prefix = isActive ? '[' : ' '
    const suffix = isActive ? ']' : ' '
    
    switch (tab) {
      case 'app':
        return `${prefix}1${suffix} App `
      case 'logs':
        return `${prefix}2${suffix} Logs (${this.#logCount}) `
      case 'output':
        return `${prefix}3${suffix} Output (${this.#outputCount}) `
      case 'scopes':
        return `${prefix}4${suffix} Scopes `
      case 'events':
        return `${prefix}5${suffix} Events `
      case 'performance':
        return `${prefix}6${suffix} Perf `
      case 'state':
        return `${prefix}7${suffix} State `
      default:
        return `${prefix}?${suffix} Unknown `
    }
  }
}

// Export singleton store
export const debugWrapperStore = new DebugWrapperStore()
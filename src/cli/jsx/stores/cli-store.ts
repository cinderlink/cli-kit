/**
 * CLI Store
 * 
 * Manages CLI application state using Svelte 5 runes
 */

import { $state, $derived } from '../../../reactivity/runes'
import type { CLIAppOptions } from '../app'

class CLIStore {
  // State
  #config = $state<CLIAppOptions>({})
  #isRunning = $state(false)
  #exitCode = $state<number | null>(null)

  // Derived state
  get config() {
    return this.#config
  }

  get name() {
    return $derived(() => this.#config.name || 'CLI Application')
  }

  get version() {
    return $derived(() => this.#config.version || '0.0.0')
  }

  get description() {
    return $derived(() => this.#config.description || '')
  }

  get isRunning() {
    return this.#isRunning
  }

  get exitCode() {
    return this.#exitCode
  }

  // Methods
  setConfig(config: CLIAppOptions) {
    this.#config = { ...this.#config, ...config }
  }

  start() {
    this.#isRunning = true
    this.#exitCode = null
  }

  stop(code: number = 0) {
    this.#isRunning = false
    this.#exitCode = code
  }

  reset() {
    this.#config = {}
    this.#isRunning = false
    this.#exitCode = null
  }
}

// Export singleton instance
export const cliStore = new CLIStore()
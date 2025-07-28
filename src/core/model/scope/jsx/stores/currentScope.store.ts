/**
 * Current scope store
 */

import { $state, type StateRune } from '@core/update/reactivity/runes'
import type { ScopeDef } from '../../types'

class CurrentScopeStore {
  private scope: StateRune<ScopeDef | null> = $state<ScopeDef | null>(null)

  get(): ScopeDef | null {
    return this.scope()
  }

  set(scope: ScopeDef | null): void {
    this.scope.$set(scope)
  }
}

// Export singleton instance
export const currentScopeStore = new CurrentScopeStore()

/**
 * Helper to get current scope in components
 */
export function useCurrentScope(): ScopeDef | null {
  return currentScopeStore.get()
}

/**
 * Parent scope store (derived from current)
 */

import { $state, type StateRune } from '@core/update/reactivity/runes'
import { scopeManager } from '../../manager'
import type { ScopeDef } from '../../types'
import { currentScopeStore } from './currentScope.store'

class ParentScopeStore {
  private parentScope: StateRune<ScopeDef | null> = $state<ScopeDef | null>(null)

  get(): ScopeDef | null {
    const current = currentScopeStore.get()
    if (!current) return null

    return scopeManager.getParentScope(current.id)
  }

  set(scope: ScopeDef | null): void {
    this.parentScope.$set(scope)
  }
}

// Export singleton instance
export const parentScopeStore = new ParentScopeStore()

/**
 * Helper to get parent scope in components
 */
export function useParentScope(): ScopeDef | null {
  return parentScopeStore.get()
}

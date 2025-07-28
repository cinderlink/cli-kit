/**
 * Root scope store (derived by walking up parents)
 */

import { scopeManager } from '../../manager'
import type { ScopeDef } from '../../types'
import { currentScopeStore } from './currentScope.store'

class RootScopeStore {
  get(): ScopeDef | null {
    const current = currentScopeStore.get()
    if (!current) return null

    let root = current
    let parent = scopeManager.getParentScope(root.id)
    while (parent) {
      root = parent
      parent = scopeManager.getParentScope(root.id)
    }
    return root
  }
}

// Export singleton instance
export const rootScopeStore = new RootScopeStore()

/**
 * Helper to get root scope in components
 */
export function useRootScope(): ScopeDef | null {
  return rootScopeStore.get()
}

/**
 * Scope Stores
 * 
 * Reactive stores for scope state using Svelte 5 runes
 */

import { $state, $derived } from '../../../reactivity/runes'
import { scopeManager } from '../../../core/model/scope/manager'
import type { ScopeDef } from '../../../core/model/scope/types'

/**
 * Current scope store
 */
class CurrentScopeStore {
  private scope = $state<ScopeDef | null>(null)
  
  get() {
    return this.scope()
  }
  
  set(scope: ScopeDef | null) {
    this.scope(scope)
  }
}

/**
 * Parent scope store (derived from current)
 */
class ParentScopeStore {
  get() {
    const current = currentScopeStore.get()
    if (!current) return null
    
    return scopeManager.getParentScope(current.id)
  }
}

/**
 * Root scope store (derived by walking up parents)
 */
class RootScopeStore {
  get() {
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

// Export singleton instances
export const currentScopeStore = new CurrentScopeStore()
export const parentScopeStore = new ParentScopeStore()
export const rootScopeStore = new RootScopeStore()

/**
 * Helper to get current scope in components
 */
export function useCurrentScope(): ScopeDef | null {
  return currentScopeStore.get()
}

/**
 * Helper to get parent scope in components
 */
export function useParentScope(): ScopeDef | null {
  return parentScopeStore.get()
}

/**
 * Helper to get root scope in components
 */
export function useRootScope(): ScopeDef | null {
  return rootScopeStore.get()
}
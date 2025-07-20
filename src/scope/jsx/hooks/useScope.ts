/**
 * Scope Hooks for JSX Integration
 * 
 * Provides React-like hooks for working with the scope system in JSX components.
 * These hooks abstract the ScopeManager and provide a clean API for scope operations.
 */

import { Effect } from 'effect'
import { onMount, onDestroy } from '../../../reactivity/runes'
import { scopeManager } from '../../manager'
import { currentScopeStore, parentScopeStore } from '../stores'
import type { ScopeDef, ScopeContext as ScopeState } from '../../types'

/**
 * Hook to create and manage a scope within a component
 * 
 * @example
 * ```tsx
 * const scope = useScope({
 *   type: 'plugin',
 *   name: 'my-plugin',
 *   description: 'My plugin description'
 * })
 * ```
 */
export function useScope(options: Omit<ScopeDef, 'id' | 'path' | 'children'>): ScopeDef {
  const scopeId = `scope_${options.type}_${options.name}_${Date.now()}`
  const parentScope = parentScopeStore.get()
  
  // Compute path based on parent
  const path = parentScope 
    ? [...parentScope.path, options.name]
    : [options.name]
  
  const scopeDef: ScopeDef = {
    id: scopeId,
    type: options.type,
    name: options.name,
    path,
    description: options.description,
    executable: options.executable ?? (options.type === 'command' || options.type === 'plugin'),
    handler: options.handler,
    args: options.args,
    flags: options.flags,
    aliases: options.aliases,
    metadata: options.metadata || {},
    children: []
  }
  
  // Register scope
  Effect.runSync(scopeManager.registerScope(scopeDef))
  
  // Set as current scope for children
  currentScopeStore.set(scopeDef)
  
  // Lifecycle management
  onMount(() => {
    Effect.runSync(scopeManager.setScopeStatus(scopeId, 'mounted'))
  })
  
  onDestroy(() => {
    // Clean up scope from registry
    Effect.runSync(scopeManager.removeScope(scopeId))
    // Clear current scope if it's still us
    if (currentScopeStore.get()?.id === scopeId) {
      currentScopeStore.set(parentScope || null)
    }
  })
  
  return scopeDef
}

/**
 * Hook to get the current scope
 */
export function useCurrentScope(): ScopeDef | null {
  return currentScopeStore.get()
}

/**
 * Hook to get the parent scope
 */
export function useParentScope(): ScopeDef | null {
  return parentScopeStore.get()
}

/**
 * Hook to manage scope lifecycle operations
 */
export function useScopeLifecycle(
  scopeId: string,
  callbacks?: {
    onActivate?: () => void
    onDeactivate?: () => void
    onStatusChange?: (status: string) => void
  }
) {
  if (!callbacks) return
  
  onMount(() => {
    // Set up listeners for scope changes
    // Note: This would ideally use an event system or reactive store
    // For now, we'll check status periodically or on demand
    
    return () => {
      // Cleanup listeners
    }
  })
}

/**
 * Hook to activate a scope and its parent chain
 */
export function useActivateScope(scopeId: string) {
  return () => {
    Effect.runSync(scopeManager.activateScope(scopeId))
  }
}

/**
 * Hook to deactivate a scope
 */
export function useDeactivateScope(scopeId: string) {
  return () => {
    Effect.runSync(scopeManager.deactivateScope(scopeId))
  }
}

/**
 * Hook to get child scopes
 */
export function useChildScopes(scopeId: string): ScopeState[] {
  return scopeManager.getChildScopes(scopeId)
}

/**
 * Hook to check if a scope is active
 */
export function useIsScopeActive(scopeId: string): boolean {
  return scopeManager.isScopeActive(scopeId)
}

/**
 * Stack-based scope management for compatibility
 * This provides push/pop semantics using the ScopeManager
 */
export const scopeStack = {
  push(scope: ScopeDef): Effect.Effect<void, never> {
    return Effect.sync(() => {
      parentScopeStore.set(currentScopeStore.get() || null)
      currentScopeStore.set(scope)
    })
  },
  
  pop(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      const parent = parentScopeStore.get()
      currentScopeStore.set(parent)
      if (parent) {
        // Find parent's parent
        const grandparent = scopeManager.getScope(parent.id)
        if (grandparent && grandparent.parentId) {
          const grandparentScope = scopeManager.getScope(grandparent.parentId)
          if (grandparentScope) {
            parentScopeStore.set(grandparentScope.def)
          } else {
            parentScopeStore.set(null)
          }
        } else {
          parentScopeStore.set(null)
        }
      }
    })
  },
  
  current(): ScopeDef | null {
    return currentScopeStore.get()
  }
}
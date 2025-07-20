/**
 * ScopeContent Component
 * 
 * Renders content when the parent scope is active.
 * Marks the scope as having rendered content.
 */

import { Effect } from 'effect'
import { onMount } from '../../../reactivity/jsx-lifecycle'
import { scopeManager, markScopeRendered } from '../../manager'
import { currentScopeStore } from '../stores'
import type { JSX } from '../../../jsx/runtime'

export interface ScopeContentProps {
  children?: JSX.Element | JSX.Element[]
}

export function ScopeContent(props: ScopeContentProps): JSX.Element | null {
  const currentScope = currentScopeStore.get()
  
  if (!currentScope) {
    console.warn('ScopeContent used outside of Scope component')
    return null
  }
  
  // Check if scope is active
  const isActive = scopeManager.isScopeActive(currentScope.id)
  
  if (!isActive) {
    return null
  }
  
  // Mark scope as having rendered content using the idiomatic helper
  // This also marks all parent scopes as having rendered children
  markScopeRendered(currentScope.id)
  
  // Also set status in lifecycle if available
  try {
    onMount(() => {
      Effect.runSync(
        scopeManager.setScopeStatus(currentScope.id, 'rendered')
      )
    })
  } catch (error) {
    // Outside component context - set status immediately
    Effect.runSync(
      scopeManager.setScopeStatus(currentScope.id, 'rendered')
    )
  }
  
  return <>{props.children}</>
}
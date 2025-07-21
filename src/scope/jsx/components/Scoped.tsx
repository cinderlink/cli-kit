/**
 * Scoped Component
 * 
 * Wrapper that only renders children if within an active scope
 */

import { currentScopeStore } from '../stores'
import { scopeManager } from '../../../core/model/scope/manager'
import type { JSX } from '../../../jsx/runtime'

export interface ScopedProps {
  children?: JSX.Element | JSX.Element[]
}

export function Scoped(props: ScopedProps): JSX.Element | null {
  const currentScope = currentScopeStore.get()
  
  if (!currentScope) {
    return null
  }
  
  const isActive = scopeManager.isScopeActive(currentScope.id)
  
  if (!isActive) {
    return null
  }
  
  return <>{props.children}</>
}
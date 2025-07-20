/**
 * Scope Component
 * 
 * Core component that manages scope lifecycle and determines what to render
 */

import { Effect } from 'effect'
import { jsx } from '../../../jsx/runtime'
import { onMount, onDestroy } from '../../../reactivity/jsx-lifecycle'
import { $state } from '../../../reactivity/runes'
import { scopeManager, setScopeDef, hasRenderedContent } from '../../manager'
import type { ScopeDef } from '../../types'
import { currentScopeStore, parentScopeStore } from '../stores'
import type { JSX } from '../../../jsx/runtime'

export interface ScopeProps {
  // Scope definition
  id?: string
  type: ScopeDef['type']
  name: string
  path?: string[]
  description?: string
  executable?: boolean
  handler?: any
  args?: Record<string, any>
  flags?: Record<string, any>
  aliases?: string[]
  metadata?: Record<string, any>
  
  // Content and layout
  children?: JSX.Element | JSX.Element[]
  defaultContent?: JSX.Element
  layout?: (content: JSX.Element) => JSX.Element
}

export function Scope(props: ScopeProps): JSX.Element {
  const scopeId = props.id || `scope_${props.type}_${props.name}_${Date.now()}`
  
  // Track if content will render
  const willRenderContent = $state(false)
  const hasRenderedChildren = $state(false)
  
  // Create scope definition
  const scopeDef: ScopeDef = {
    id: scopeId,
    type: props.type,
    name: props.name,
    path: props.path || [],
    description: props.description,
    executable: props.executable ?? (props.type === 'command' || props.type === 'plugin'),
    handler: props.handler,
    args: props.args,
    flags: props.flags,
    aliases: props.aliases,
    metadata: props.metadata || {},
    children: []
  }
  
  // Set parent scope if we have one
  const parentScope = parentScopeStore.get()
  if (parentScope && scopeDef.path.length === 0) {
    // Compute path from parent
    scopeDef.path = [...parentScope.path, props.name]
  }
  
  // Register with scope manager and emit events using the idiomatic helper
  setScopeDef(scopeDef)
  
  // Set as current scope
  currentScopeStore.set(scopeDef)
  
  // Try to use lifecycle hooks if available
  try {
    onMount(() => {
      // Mark as mounted
      Effect.runSync(scopeManager.setScopeStatus(scopeId, 'mounted'))
      
      // Cleanup on unmount
      return () => {
        currentScopeStore.set(null)
      }
    })
  } catch (error) {
    // We're outside a component context (e.g., during plugin registration)
    // Mark as mounted immediately
    Effect.runSync(scopeManager.setScopeStatus(scopeId, 'mounted'))
  }
  
  // Check if scope is active
  const isActive = scopeManager.isScopeActive(scopeId)
  
  // Get child scopes
  const childScopes = scopeManager.getChildScopes(scopeId)
  
  // Process children to see what will render
  const { children, defaultContent, layout } = props
  
  // Normalize children to array
  const childArray = Array.isArray(children) ? children : children ? [children] : []
  
  // Check if we have ScopeContent children that will render
  const hasScopeContent = childArray.some(child => 
    child && typeof child === 'object' && child.type === 'ScopeContent'
  )
  
  // Determine what to render
  let content: JSX.Element | null = null
  
  if (!isActive) {
    // Not active - render empty element to avoid null errors
    return jsx('text', { children: '' })
  }
  
  // For executable scopes, check if we should show help
  const shouldShowHelp = props.executable && !hasRenderedContent(scopeId)
  
  if (shouldShowHelp) {
    // Executable scope with no rendered content - show help
    content = <ScopeFallback scopeId={scopeId} />
  } else if (hasScopeContent) {
    // Has ScopeContent - it will handle rendering
    content = <>{children}</>
  } else if (childScopes.length > 0 || defaultContent) {
    // Has child scopes or default content
    content = defaultContent || <>{children}</>
  } else {
    // Regular content
    content = <>{children}</>
  }
  
  // Apply layout if provided
  if (layout && content) {
    content = layout(content)
  }
  
  return content
}

// Import ScopeFallback to avoid circular dependency
import { ScopeFallback } from './ScopeFallback'
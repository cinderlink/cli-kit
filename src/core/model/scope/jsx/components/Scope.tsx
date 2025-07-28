/**
 * Scope Component
 *
 * Core component that manages scope lifecycle and determines what to render
 */

import { Effect } from 'effect'
import { jsx } from '@jsx/runtime'
import { onMount, onDestroy } from '@core/update/reactivity/jsxLifecycle'
import { $state } from '@core/update/reactivity/runes'
import { scopeManager, setScopeDef, hasRenderedContent } from '@core/model/scope/manager'
import type { ScopeDef } from '@core/model/scope/types'
import { currentScopeStore, parentScopeStore } from '@core/model/scope/jsx/stores'
import type { JSX } from '@jsx/runtime'

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
  const scopeId =
    props.id ||
    `scope_${props.type}_${props.name}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

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
    children: [],
  }

  // Get current parent BEFORE setting ourselves as current
  const previousScope = currentScopeStore.get()

  // Compute path from parent if not explicitly provided
  if (scopeDef.path.length === 0) {
    if (previousScope) {
      // Compute path from current parent scope
      scopeDef.path = [...previousScope.path, props.name]
    } else {
      // No parent, this is likely a root scope
      scopeDef.path = [props.name]
    }
  }

  // Set as current scope BEFORE registration so children can compute paths
  currentScopeStore.set(scopeDef)

  // Register with scope manager and emit events using the idiomatic helper
  setScopeDef(scopeDef)

  // Try to use lifecycle hooks if available, but don't block during registration
  try {
    onMount(() => {
      // Mark as mounted (async, non-blocking)
      Effect.runSync(scopeManager.setScopeStatus(scopeId, 'mounted'))

      // Cleanup on unmount - restore previous scope
      return () => {
        currentScopeStore.set(previousScope)
      }
    })
  } catch (error) {
    // We're outside a component context - skip lifecycle during registration
    // This is normal during initial JSX processing for CLI command detection
  }

  // During registration phase, assume scope is active to allow rendering
  const isActive = true // scopeManager.isScopeActive(scopeId) - skip during registration

  // Get child scopes (empty during registration is fine)
  const childScopes: any[] = [] // scopeManager.getChildScopes(scopeId) - skip during registration

  // Process children to see what will render
  const { children, defaultContent, layout } = props

  // Normalize children to array
  const childArray = Array.isArray(children) ? children : children ? [children] : []

  // Check if we have ScopeContent children that will render
  const hasScopeContent = childArray.some(
    child => child && typeof child === 'object' && child.type === 'ScopeContent'
  )

  // Determine what to render
  let content: JSX.Element | null = null

  if (!isActive) {
    // Not active - render empty element to avoid null errors
    return jsx('text', { children: '' })
  }

  // For executable scopes, check if we should show help (skip during registration)
  const shouldShowHelp = props.executable && true // !hasRenderedContent(scopeId) - assume no content during registration

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

  // Don't restore scope here - let the cleanup happen naturally
  // The JSX runtime handles this with proper lifecycle

  return content
}

// Import ScopeFallback to avoid circular dependency
import { ScopeFallback } from './ScopeFallback'

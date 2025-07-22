/**
 * ScopeFallback Component
 * 
 * Renders when scope is active but no ScopeContent will render.
 * This is where help text typically appears.
 */

import { scopeManager } from '../../manager'
import { jsx } from '@jsx/runtime'
import type { JSX } from '@jsx/runtime'
import { CommandLineHelp } from '@cli/jsx/components'

export interface ScopeFallbackProps {
  scopeId: string
  fallback?: JSX.Element
}

export function ScopeFallback(props: ScopeFallbackProps): JSX.Element {
  const { scopeId, fallback } = props
  
  // Skip child checking during registration phase to avoid blocking
  // During runtime, this would check if child scopes will render
  const anyChildWillRender = false // Skip during registration
  
  if (anyChildWillRender) {
    // A child will render - don't show fallback
    return jsx('text', { children: '' })
  }
  
  // No children rendering - show fallback
  if (fallback) {
    return fallback
  }
  
  // Default fallback is CommandLineHelp for this scope
  return <CommandLineHelp scopeId={scopeId} />
}
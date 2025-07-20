/**
 * Scope Module
 * 
 * Core scope management system for TUIX
 */

// Export types
export * from './types'

// Export manager
export { scopeManager, ScopeManager } from './manager'

// Export JSX components
export { Scope } from './jsx/components/Scope'
export { ScopeContent } from './jsx/components/ScopeContent'
export { ScopeFallback } from './jsx/components/ScopeFallback'
export { Scoped } from './jsx/components/Scoped'
export { Unscoped } from './jsx/components/Unscoped'

// Export stores and hooks
export {
  currentScopeStore,
  parentScopeStore,
  rootScopeStore,
  useCurrentScope,
  useParentScope,
  useRootScope
} from './jsx/stores'
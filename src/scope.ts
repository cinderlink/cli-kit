/**
 * Scope System - Re-exports for backwards compatibility
 *
 * This file provides backwards compatibility for modules that import from '../scope'
 * while the actual scope system lives in core/model/scope.
 */

// Re-export everything from the core scope system
export * from './core/model/scope'

// Also re-export JSX scope utilities for backwards compatibility
export type { ScopeProps, ScopeContext as JSXScopeContext } from './jsx/scope'
export {
  getCurrentScope,
  pushScope,
  popScope,
  generateScopeHelp,
  Scope,
  markScopeExecuted,
} from './jsx/scope'

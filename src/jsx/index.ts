/**
 * JSX Module - Main export barrel for JSX functionality
 *
 * This module provides all JSX-related exports including:
 * - JSX runtime functions
 * - Component factories
 * - Configuration and validation
 * - Rendering utilities
 */

// Runtime exports
export {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  type JSXContext,
} from './runtime'

// App exports
export {
  // Core functions
  render,
  createJSXApp,
  createJSXPlugin,
  // Layout components
  Box,
  panel,
  button,
  input,
  // Types
  type JSXPlugin,
  // Re-export runes and lifecycle
  $state,
  $bindable,
  $derived,
  $effect,
  onMount,
  onDestroy,
  beforeUpdate,
  afterUpdate,
  tick,
  untrack,
  withLifecycle,
} from './app'

// Configuration exports
export { validateJSXElement } from './impl/configValidator'

// Rendering exports
export { renderToTerminal, renderToString } from './impl/render'

// Re-export components from the components directory
export { Exit as ExitComponent } from '@ui/components/system'
export {
  TextInput as JSXTextInput,
  type TextInputProps as JSXTextInputProps,
} from '@ui/components/forms/text-input'

// Constants
export * from './constants'

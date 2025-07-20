/**
 * Component Builders - Simplified API
 * 
 * This module provides a comprehensive set of pre-built components and utilities
 * for building terminal user interfaces. All components follow the Model-View-Update
 * pattern and integrate seamlessly with the Effect.ts ecosystem.
 * 
 * ## Available Exports:
 * 
 * ### UI Components
 * - **Panels**: Pre-styled container components for content organization
 * - **Buttons**: Interactive button components with various styles and behaviors
 * 
 * ### Core Systems
 * - **Component System**: Core component creation and wrapping utilities
 * - **Reactivity**: State management and reactive programming utilities
 * - **Lifecycle**: Component lifecycle management hooks
 * 
 * ### Primitives
 * - **View Building**: Core view construction functions (text, styledText, layout)
 * - **Styling**: Style and color utilities for component theming
 * 
 * @example
 * ```typescript
 * import { PrimaryButton, InfoPanel, $state } from './builders'
 * 
 * // Create reactive state
 * const count = $state(0)
 * 
 * // Create components
 * const button = PrimaryButton("Click me", () => count.set(count.get() + 1))
 * const panel = InfoPanel(`Count: ${count.get()}`)
 * ```
 */

// =============================================================================
// UI Components - Pre-built interactive components
// =============================================================================

/**
 * Panel Components - Container components for content organization
 * 
 * Provides styled containers with semantic meanings (info, success, warning, error)
 * and layout variants (collapsible, floating, sidebar, etc.)
 */
export {
  Panel,
  HeaderPanel,
  InfoPanel,
  SuccessPanel,
  WarningPanel,
  ErrorPanel,
  Card,
  Sidebar,
  StatusPanel,
  CollapsiblePanel,
  ThemedPanel,
  FloatingPanel
} from './Panel'

/**
 * Button Components - Interactive button elements
 * 
 * Provides styled buttons with semantic colors (primary, success, danger, etc.)
 * and behavioral variants (loading, disabled, grouped, etc.)
 */
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton,
  WarningButton,
  InfoButton,
  GhostButton,
  IconButton,
  SmallButton,
  LargeButton,
  DisabledButton,
  LoadingButton,
  FullWidthButton,
  ButtonGroup,
  SubmitCancelButtons,
  YesNoButtons
} from './Button'

// =============================================================================
// Core Systems - Component infrastructure and state management
// =============================================================================

/**
 * Component System - Core component creation and management utilities
 * 
 * Provides functions for creating, wrapping, and composing components
 * with functional and reactive patterns.
 */
export {
  createComponent,
  wrapComponent,
  functional,
  reactive
} from '../component'

/**
 * Reactivity System - State management and reactive programming
 * 
 * Svelte-inspired reactive primitives for managing component state
 * with automatic dependency tracking and updates.
 */
export {
  $state,
  $derived,
  $effect,
  $memo,
  $debounced,
  $throttled,
  createStore,
  batch
} from '../reactivity'

/**
 * Lifecycle System - Component lifecycle management
 * 
 * Hooks for managing component mounting, updating, and cleanup
 * with utilities for async effects and timers.
 */
export {
  onMount,
  onDestroy,
  beforeUpdate,
  afterUpdate,
  useInterval,
  useTimeout,
  useAsyncEffect,
  usePrevious,
  tick
} from '../lifecycle'

// =============================================================================
// Primitives - Low-level building blocks
// =============================================================================

/**
 * View Building Functions - Core view construction primitives
 * 
 * Fundamental functions for creating and composing views in the terminal.
 * These are the building blocks for all UI components.
 */
export {
  text,
  styledText,
  vstack,
  hstack
} from '@tuix/core'

/**
 * Styling Utilities - Colors, styles, and visual theming
 * 
 * Comprehensive styling system for creating beautiful terminal interfaces
 * with colors, borders, and text formatting.
 */
export {
  style,
  Colors
} from '@tuix/styling'

export {
  Borders
} from '@tuix/styling'

// =============================================================================
// Types - TypeScript types for component development
// =============================================================================

/**
 * Component and View Types - Core type definitions
 * 
 * Essential types for component development and type safety.
 */
export type {
  View,
  Cmd,
  Component,
  AppServices
} from '@tuix/core'

/**
 * Styling Types - Type definitions for styling system
 * 
 * Types for working with the styling system and creating custom styles.
 */
export type {
  Style,
  StyleProps,
  BorderStyle
} from '@tuix/styling'
/**
 * JSX Module Type Definitions
 *
 * Centralized type definitions for the JSX module, providing types for
 * JSX elements, components, runtime, and integration with the core system.
 */

import { Effect } from 'effect'
import type { View } from '@core/index'

/**
 * JSX Element type - represents a JSX element in the virtual DOM
 */
export interface JSXElement {
  type: string | Function
  props: Record<string, unknown> | null
  children: JSXChildren
  key?: string | number
}

/**
 * JSX Children type - can be elements, text, or arrays
 */
export type JSXChildren = JSXElement | JSXElement[] | string | number | boolean | null | undefined

/**
 * JSX Fragment props
 */
export interface FragmentProps {
  children?: JSXChildren
}

/**
 * JSX Component props with standard React-like interface
 */
export interface JSXComponentProps {
  children?: JSXChildren
  key?: string | number
  [prop: string]: unknown
}

/**
 * JSX Functional Component type
 */
export type JSXFunctionalComponent<P = {}> = (props: P & JSXComponentProps) => JSXElement | null

/**
 * JSX Class Component interface
 */
export interface JSXClassComponent<P = {}, S = {}> {
  new (
    props: P & JSXComponentProps
  ): {
    props: P & JSXComponentProps
    state?: S
    render(): JSXElement | null
  }
}

/**
 * JSX Component type union
 */
export type JSXComponent<P = {}> = JSXFunctionalComponent<P> | JSXClassComponent<P>

/**
 * JSX Runtime configuration
 */
export interface JSXRuntimeConfig {
  /** Enable development mode with extra warnings and checks */
  development?: boolean
  /** Fragment component to use for empty wrappers */
  Fragment?: JSXComponent
  /** Enable automatic key generation for list items */
  autoKey?: boolean
}

/**
 * JSX Render options
 */
export interface JSXRenderOptions {
  /** Target container for rendering */
  container?: View
  /** Enable CLI auto-detection and integration */
  enableCLI?: boolean
  /** Custom runtime configuration */
  runtime?: JSXRuntimeConfig
}

/**
 * JSX Plugin interface for extending functionality
 */
export interface JSXPlugin {
  /** Unique plugin identifier */
  id: string
  /** Plugin name for display */
  name: string
  /** Plugin version */
  version: string
  /** Transform JSX elements before rendering */
  transform?: (element: JSXElement) => JSXElement | Effect.Effect<JSXElement>
  /** Process components before mounting */
  processComponent?: (component: JSXComponent) => JSXComponent | Effect.Effect<JSXComponent>
}

/**
 * JSX Plugin Registry interface
 */
export interface JSXPluginRegistry {
  /** Register a new plugin */
  register(plugin: JSXPlugin): Effect.Effect<void>
  /** Get registered plugin by ID */
  get(id: string): JSXPlugin | undefined
  /** Get all registered plugins */
  getAll(): JSXPlugin[]
  /** Remove plugin by ID */
  remove(id: string): Effect.Effect<boolean>
}

/**
 * JSX Element creation factory
 */
export type JSXElementFactory = (
  type: string | JSXComponent,
  props?: Record<string, unknown> | null,
  ...children: JSXChildren[]
) => JSXElement

/**
 * JSX App configuration
 */
export interface JSXAppConfig extends JSXRenderOptions {
  /** Application root component */
  App: JSXComponent
  /** Enable hot reloading in development */
  hotReload?: boolean
  /** Custom error boundary component */
  ErrorBoundary?: JSXComponent<{ error: Error; children: JSXChildren }>
}

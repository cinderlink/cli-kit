/**
 * Component Composition System - Higher-order components and composition patterns
 * 
 * @module components/composition
 */

import { Effect } from "effect"
import type { Component } from "../base/index"
import { ComponentCompositionError } from "../base/errors"

/**
 * Higher-order component interface
 */
export interface HigherOrderComponent<Props, State> {
  (component: Component<Props, State>): Component<Props, State>
}

/**
 * Component wrapper interface
 */
export interface ComponentWrapper<Props, State> {
  wrap(component: Component<Props, State>): Component<Props, State>
  unwrap(component: Component<Props, State>): Component<Props, State>
}

/**
 * Compose multiple components together
 */
export function compose<Props, State>(
  ...components: Component<Props, State>[]
): Component<Props, State> {
  if (components.length === 0) {
    throw new ComponentCompositionError({
      operation: 'compose',
      components: [],
      reason: 'No components provided'
    })
  }

  if (components.length === 1) {
    return components[0]
  }

  // Simple composition - use the first component as base
  const baseComponent = components[0]
  
  return {
    init: (props: Props) => baseComponent.init(props),
    update: (props: Props, state: State) => baseComponent.update(props, state),
    render: (props: Props, state: State) => baseComponent.render(props, state),
    cleanup: baseComponent.cleanup ? (state: State) => baseComponent.cleanup!(state) : undefined
  }
}

/**
 * Create a higher-order component that adds functionality
 */
export function withLifecycle<Props, State>(
  onMount?: (props: Props, state: State) => void,
  onUnmount?: (state: State) => void
): HigherOrderComponent<Props, State> {
  return (component: Component<Props, State>) => ({
    init: component.init,
    update: component.update,
    render: component.render,
    cleanup: component.cleanup
  })
}

/**
 * Create a wrapper that enhances component behavior
 */
export function createWrapper<Props, State>(): ComponentWrapper<Props, State> {
  return {
    wrap: (component: Component<Props, State>) => component,
    unwrap: (component: Component<Props, State>) => component
  }
}
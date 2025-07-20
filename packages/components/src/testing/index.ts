/**
 * Component Testing Framework - Testing utilities for components
 * 
 * @module components/testing
 */

import { Effect } from "effect"
import type { Component } from "../base/index"
import { ComponentTestingError } from "../base/errors"

/**
 * Component test harness interface
 */
export interface ComponentTestHarness<Props, State> {
  render(props: Props): Promise<ComponentTestResult<State>>
  update(props: Props): Promise<ComponentTestResult<State>>
  unmount(): Promise<void>
  getState(): State | undefined
  getProps(): Props | undefined
}

/**
 * Component test result interface
 */
export interface ComponentTestResult<State> {
  state: State
  rendered: JSX.Element
  errors: Error[]
}

/**
 * Component test utilities interface
 */
export interface ComponentTestUtils {
  createHarness<Props, State>(component: Component<Props, State>): ComponentTestHarness<Props, State>
  mockComponent<Props, State>(name: string): Component<Props, State>
  simulateEvent(event: ComponentEvent): void
}

/**
 * Default test harness implementation
 */
export class DefaultComponentTestHarness<Props, State> implements ComponentTestHarness<Props, State> {
  private component: Component<Props, State>
  private currentState: State | undefined
  private currentProps: Props | undefined

  constructor(component: Component<Props, State>) {
    this.component = component
  }

  async render(props: Props): Promise<ComponentTestResult<State>> {
    try {
      const state = await Effect.runPromise(this.component.init(props))
      this.currentState = state
      this.currentProps = props
      
      const rendered = this.component.render(props, state)
      
      return {
        state,
        rendered,
        errors: []
      }
    } catch (error) {
      throw new ComponentTestingError({
        componentName: 'unknown',
        testOperation: 'render',
        cause: error
      })
    }
  }

  async update(props: Props): Promise<ComponentTestResult<State>> {
    if (!this.currentState) {
      throw new ComponentTestingError({
        componentName: 'unknown',
        testOperation: 'update',
        reason: 'Component not rendered'
      })
    }

    try {
      const newState = await Effect.runPromise(this.component.update(props, this.currentState))
      this.currentState = newState
      this.currentProps = props
      
      const rendered = this.component.render(props, newState)
      
      return {
        state: newState,
        rendered,
        errors: []
      }
    } catch (error) {
      throw new ComponentTestingError({
        componentName: 'unknown',
        testOperation: 'update',
        cause: error
      })
    }
  }

  async unmount(): Promise<void> {
    if (this.currentState && this.component.cleanup) {
      await Effect.runPromise(this.component.cleanup(this.currentState))
    }
    this.currentState = undefined
    this.currentProps = undefined
  }

  getState(): State | undefined {
    return this.currentState
  }

  getProps(): Props | undefined {
    return this.currentProps
  }
}

/**
 * Default test utilities implementation
 */
export class DefaultComponentTestUtils implements ComponentTestUtils {
  createHarness<Props, State>(component: Component<Props, State>): ComponentTestHarness<Props, State> {
    return new DefaultComponentTestHarness(component)
  }

  mockComponent<Props, State>(name: string): Component<Props, State> {
    return {
      init: (props: Props) => Effect.succeed({} as State),
      update: (props: Props, state: State) => Effect.succeed(state),
      render: (props: Props, state: State) => Effect.succeed(`Mock ${name}`)
    }
  }

  simulateEvent(event: any): void {
    // Simplified event simulation
    console.log('Simulated event:', event)
  }
}

/**
 * Global test utilities
 */
export const globalTestUtils: ComponentTestUtils = new DefaultComponentTestUtils()

/**
 * Create a test harness for a component
 */
export function createTestHarness<Props, State>(component: Component<Props, State>): ComponentTestHarness<Props, State> {
  return globalTestUtils.createHarness(component)
}
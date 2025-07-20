/**
 * Component System Tests
 * 
 * Tests for the core component system functionality
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { Component, BaseComponent } from "../base/index"
import { createLifecycleManager } from "../lifecycle/index"
import { createState, PropValidators } from "../props/index"
import { globalRegistry } from "../registry/index"
import { Text, Box, Button } from "../builtin/index"

// Test component
interface TestProps {
  title: string
  count: number
}

interface TestState {
  value: number
  mounted: boolean
}

class TestComponent extends BaseComponent<TestProps, TestState> {
  init(props: TestProps): Effect.Effect<TestState, any, never> {
    return Effect.succeed({
      value: props.count,
      mounted: true
    })
  }

  render(props: TestProps, state: TestState): JSX.Element {
    return { type: 'div', props: { children: `${props.title}: ${state.value}` } } as JSX.Element
  }
}

test("Component base interface works", () => {
  const component = new TestComponent()
  expect(component).toBeDefined()
  expect(typeof component.init).toBe('function')
  expect(typeof component.render).toBe('function')
})

test("Component lifecycle works", async () => {
  const manager = createLifecycleManager()
  const component = new TestComponent()
  const props = { title: "Test", count: 5 }

  const state = await Effect.runPromise(manager.mount(component, props))
  expect(state.value).toBe(5)
  expect(state.mounted).toBe(true)
})

test("Component state works", () => {
  const state = createState({ count: 0 })
  expect(state.value.count).toBe(0)

  state.update(s => ({ ...s, count: s.count + 1 }))
  expect(state.value.count).toBe(1)
})

test("Props validation works", () => {
  const validator = PropValidators.string({ required: true })
  expect(validator.validate("hello")).toBe("hello")
  expect(() => validator.validate(123)).toThrow()
})

test("Built-in components work", () => {
  const text = new Text()
  const box = new Box()
  const button = new Button()

  expect(text).toBeDefined()
  expect(box).toBeDefined()
  expect(button).toBeDefined()
})

test("Component registry works", () => {
  globalRegistry.register({
    name: 'TestComponent',
    component: TestComponent,
    metadata: { description: 'Test component' }
  })

  expect(globalRegistry.has('TestComponent')).toBe(true)
  expect(globalRegistry.list()).toContain('TestComponent')

  const component = globalRegistry.create('TestComponent', { title: "Test", count: 1 })
  expect(component).toBeDefined()
})
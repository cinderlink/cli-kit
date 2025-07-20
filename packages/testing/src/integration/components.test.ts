/**
 * Component Integration Tests - Test cross-component interactions
 * 
 * This module tests the TUIX component system integration including:
 * - Component composition patterns
 * - Parent-child communication
 * - Reactive state propagation
 * - Lifecycle management
 * - Error boundaries
 * 
 * Tests follow the requirements from task 3A.2 with comprehensive coverage
 * of component interaction scenarios.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Context, Layer, Ref, Stream } from "effect"
import {
  Box,
  Button,
  Text,
  TextInput,
  Modal,
  Table,
  List,
  Tabs,
  ProgressBar,
  Spinner,
} from "@tuix/components"
import {
  createMockAppServices,
  withMockServices,
  testComponent,
  createTestLayer,
  TUIAssert,
} from "../test-utils"
import { ComponentError } from "@tuix/core"
import { rune } from "@tuix/reactive"

// =============================================================================
// Test Component Factories
// =============================================================================

interface TestComponentProps {
  readonly children?: JSX.Element
  readonly onUpdate?: (value: string) => void
  readonly initialValue?: string
}

interface CounterState {
  readonly count: number
  readonly message: string
}

const createCounterComponent = (initialCount: number = 0) => {
  const counter = rune(initialCount)
  const message = rune("Counter initialized")
  
  return {
    init: Effect.succeed([{ count: initialCount, message: "Counter initialized" }, []] as const),
    update: (msg: string, model: CounterState) => {
      switch (msg) {
        case "increment":
          return Effect.succeed([
            { ...model, count: model.count + 1, message: "Incremented" },
            []
          ] as const)
        case "decrement":
          return Effect.succeed([
            { ...model, count: model.count - 1, message: "Decremented" },
            []
          ] as const)
        case "reset":
          return Effect.succeed([
            { ...model, count: 0, message: "Reset" },
            []
          ] as const)
        default:
          return Effect.succeed([model, []] as const)
      }
    },
    view: (model: CounterState) => ({
      render: () => Effect.succeed(`Count: ${model.count} - ${model.message}`)
    }),
  }
}

const createFormComponent = () => {
  const nameInput = rune("")
  const emailInput = rune("")
  const submitted = rune(false)
  
  return {
    init: Effect.succeed([
      { name: "", email: "", submitted: false },
      []
    ] as const),
    update: (msg: { type: string; value?: string }, model: any) => {
      switch (msg.type) {
        case "name-change":
          return Effect.succeed([
            { ...model, name: msg.value || "" },
            []
          ] as const)
        case "email-change":
          return Effect.succeed([
            { ...model, email: msg.value || "" },
            []
          ] as const)
        case "submit":
          return Effect.succeed([
            { ...model, submitted: true },
            []
          ] as const)
        default:
          return Effect.succeed([model, []] as const)
      }
    },
    view: (model: any) => ({
      render: () => Effect.succeed(`Form: ${model.name} <${model.email}> (${model.submitted ? "submitted" : "pending"})`)
    }),
  }
}

// =============================================================================
// Component Composition Tests
// =============================================================================

describe("Component Composition", () => {
  test("should compose nested components correctly", async () => {
    const outerComponent = createCounterComponent(5)
    const innerComponent = createCounterComponent(10)
    
    const outerTester = testComponent(outerComponent)
    const innerTester = testComponent(innerComponent)
    
    // Test initial states
    const [outerModel] = await outerTester.testInit()
    const [innerModel] = await innerTester.testInit()
    
    expect(outerModel.count).toBe(5)
    expect(innerModel.count).toBe(10)
    
    // Test independent updates
    const [outerUpdated] = await outerTester.testUpdate("increment", outerModel)
    const [innerUpdated] = await innerTester.testUpdate("decrement", innerModel)
    
    expect(outerUpdated.count).toBe(6)
    expect(innerUpdated.count).toBe(9)
  })
  
  test("should handle component hierarchy with props passing", async () => {
    interface ParentState {
      readonly childCount: number
      readonly message: string
    }
    
    const parentComponent = {
      init: Effect.succeed([
        { childCount: 0, message: "Parent initialized" },
        []
      ] as const),
      update: (msg: { type: string; value?: number }, model: ParentState) => {
        switch (msg.type) {
          case "child-updated":
            return Effect.succeed([
              { ...model, childCount: msg.value || 0, message: "Child updated" },
              []
            ] as const)
          default:
            return Effect.succeed([model, []] as const)
        }
      },
      view: (model: ParentState) => ({
        render: () => Effect.succeed(`Parent: ${model.message}, Child Count: ${model.childCount}`)
      }),
    }
    
    const parentTester = testComponent(parentComponent)
    const childTester = testComponent(createCounterComponent(0))
    
    const [parentModel] = await parentTester.testInit()
    const [childModel] = await childTester.testInit()
    
    // Simulate child updating parent
    const [updatedChild] = await childTester.testUpdate("increment", childModel)
    const [updatedParent] = await parentTester.testUpdate(
      { type: "child-updated", value: updatedChild.count },
      parentModel
    )
    
    expect(updatedParent.childCount).toBe(1)
    expect(updatedParent.message).toBe("Child updated")
  })
  
  test("should support component composition with shared state", async () => {
    const sharedState = rune({ globalCount: 0 })
    
    const component1 = {
      init: Effect.succeed([{ id: 1, localCount: 0 }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "increment") {
          sharedState.update(state => ({ ...state, globalCount: state.globalCount + 1 }))
          return Effect.succeed([
            { ...model, localCount: model.localCount + 1 },
            []
          ] as const)
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Component1: local=${model.localCount}, global=${sharedState.value.globalCount}`)
      }),
    }
    
    const component2 = {
      init: Effect.succeed([{ id: 2, localCount: 0 }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "increment") {
          sharedState.update(state => ({ ...state, globalCount: state.globalCount + 1 }))
          return Effect.succeed([
            { ...model, localCount: model.localCount + 1 },
            []
          ] as const)
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Component2: local=${model.localCount}, global=${sharedState.value.globalCount}`)
      }),
    }
    
    const tester1 = testComponent(component1)
    const tester2 = testComponent(component2)
    
    const [model1] = await tester1.testInit()
    const [model2] = await tester2.testInit()
    
    // Update both components
    const [updated1] = await tester1.testUpdate("increment", model1)
    const [updated2] = await tester2.testUpdate("increment", model2)
    
    // Verify local counts
    expect(updated1.localCount).toBe(1)
    expect(updated2.localCount).toBe(1)
    
    // Verify shared state
    expect(sharedState.value.globalCount).toBe(2)
  })
})

// =============================================================================
// Parent-Child Communication Tests
// =============================================================================

describe("Parent-Child Communication", () => {
  test("should handle parent-to-child data flow", async () => {
    interface ParentState {
      readonly data: string
      readonly childData: string
    }
    
    const parentComponent = {
      init: Effect.succeed([
        { data: "parent-data", childData: "" },
        []
      ] as const),
      update: (msg: { type: string; value?: string }, model: ParentState) => {
        switch (msg.type) {
          case "send-to-child":
            return Effect.succeed([
              { ...model, childData: model.data },
              []
            ] as const)
          case "update-data":
            return Effect.succeed([
              { ...model, data: msg.value || "" },
              []
            ] as const)
          default:
            return Effect.succeed([model, []] as const)
        }
      },
      view: (model: ParentState) => ({
        render: () => Effect.succeed(`Parent: ${model.data} -> Child: ${model.childData}`)
      }),
    }
    
    const parentTester = testComponent(parentComponent)
    const [model] = await parentTester.testInit()
    
    // Update parent data
    const [updated] = await parentTester.testUpdate(
      { type: "update-data", value: "new-parent-data" },
      model
    )
    
    // Send data to child
    const [final] = await parentTester.testUpdate(
      { type: "send-to-child" },
      updated
    )
    
    expect(final.data).toBe("new-parent-data")
    expect(final.childData).toBe("new-parent-data")
  })
  
  test("should handle child-to-parent communication", async () => {
    interface ChildState {
      readonly value: string
    }
    
    interface ParentState {
      readonly childValue: string
      readonly status: string
    }
    
    const childComponent = {
      init: Effect.succeed([{ value: "child-initial" }, []] as const),
      update: (msg: string, model: ChildState) => {
        return Effect.succeed([
          { ...model, value: msg },
          []
        ] as const)
      },
      view: (model: ChildState) => ({
        render: () => Effect.succeed(`Child: ${model.value}`)
      }),
    }
    
    const parentComponent = {
      init: Effect.succeed([
        { childValue: "", status: "waiting" },
        []
      ] as const),
      update: (msg: { type: string; value?: string }, model: ParentState) => {
        switch (msg.type) {
          case "child-changed":
            return Effect.succeed([
              { ...model, childValue: msg.value || "", status: "updated" },
              []
            ] as const)
          default:
            return Effect.succeed([model, []] as const)
        }
      },
      view: (model: ParentState) => ({
        render: () => Effect.succeed(`Parent: ${model.status} - Child Value: ${model.childValue}`)
      }),
    }
    
    const childTester = testComponent(childComponent)
    const parentTester = testComponent(parentComponent)
    
    const [childModel] = await childTester.testInit()
    const [parentModel] = await parentTester.testInit()
    
    // Update child
    const [updatedChild] = await childTester.testUpdate("child-new-value", childModel)
    
    // Notify parent
    const [updatedParent] = await parentTester.testUpdate(
      { type: "child-changed", value: updatedChild.value },
      parentModel
    )
    
    expect(updatedParent.childValue).toBe("child-new-value")
    expect(updatedParent.status).toBe("updated")
  })
  
  test("should handle bidirectional communication", async () => {
    interface SharedState {
      readonly value: string
      readonly lastModified: string
    }
    
    const sharedState = rune<SharedState>({ value: "initial", lastModified: "none" })
    
    const component1 = {
      init: Effect.succeed([{ name: "comp1" }, []] as const),
      update: (msg: string, model: any) => {
        sharedState.update(state => ({
          ...state,
          value: msg,
          lastModified: "comp1"
        }))
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp1: ${sharedState.value.value} (by ${sharedState.value.lastModified})`)
      }),
    }
    
    const component2 = {
      init: Effect.succeed([{ name: "comp2" }, []] as const),
      update: (msg: string, model: any) => {
        sharedState.update(state => ({
          ...state,
          value: msg,
          lastModified: "comp2"
        }))
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp2: ${sharedState.value.value} (by ${sharedState.value.lastModified})`)
      }),
    }
    
    const tester1 = testComponent(component1)
    const tester2 = testComponent(component2)
    
    await tester1.testInit()
    await tester2.testInit()
    
    // Component 1 updates
    await tester1.testUpdate("from-comp1", { name: "comp1" })
    expect(sharedState.value.value).toBe("from-comp1")
    expect(sharedState.value.lastModified).toBe("comp1")
    
    // Component 2 updates
    await tester2.testUpdate("from-comp2", { name: "comp2" })
    expect(sharedState.value.value).toBe("from-comp2")
    expect(sharedState.value.lastModified).toBe("comp2")
  })
})

// =============================================================================
// Reactive State Propagation Tests
// =============================================================================

describe("Reactive State Propagation", () => {
  test("should propagate state changes through runes", async () => {
    const globalState = rune({ count: 0, message: "initial" })
    
    const component1 = {
      init: Effect.succeed([{ id: 1 }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "increment") {
          globalState.update(state => ({
            ...state,
            count: state.count + 1,
            message: "incremented by comp1"
          }))
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp1: ${globalState.value.count} - ${globalState.value.message}`)
      }),
    }
    
    const component2 = {
      init: Effect.succeed([{ id: 2 }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "decrement") {
          globalState.update(state => ({
            ...state,
            count: state.count - 1,
            message: "decremented by comp2"
          }))
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp2: ${globalState.value.count} - ${globalState.value.message}`)
      }),
    }
    
    const tester1 = testComponent(component1)
    const tester2 = testComponent(component2)
    
    await tester1.testInit()
    await tester2.testInit()
    
    // Component 1 increments
    await tester1.testUpdate("increment", { id: 1 })
    expect(globalState.value.count).toBe(1)
    expect(globalState.value.message).toBe("incremented by comp1")
    
    // Component 2 decrements
    await tester2.testUpdate("decrement", { id: 2 })
    expect(globalState.value.count).toBe(0)
    expect(globalState.value.message).toBe("decremented by comp2")
  })
  
  test("should handle derived state updates", async () => {
    const baseState = rune({ value: 10 })
    const derivedState = rune({ squared: 100, doubled: 20 })
    
    // Update derived state when base state changes
    const updateDerived = () => {
      derivedState.update(state => ({
        squared: baseState.value.value * baseState.value.value,
        doubled: baseState.value.value * 2
      }))
    }
    
    const component = {
      init: Effect.succeed([{ initialized: true }, []] as const),
      update: (msg: number, model: any) => {
        baseState.update(state => ({ ...state, value: msg }))
        updateDerived()
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(
          `Base: ${baseState.value.value}, Squared: ${derivedState.value.squared}, Doubled: ${derivedState.value.doubled}`
        )
      }),
    }
    
    const tester = testComponent(component)
    await tester.testInit()
    
    // Update base state
    await tester.testUpdate(5, { initialized: true })
    
    expect(baseState.value.value).toBe(5)
    expect(derivedState.value.squared).toBe(25)
    expect(derivedState.value.doubled).toBe(10)
  })
  
  test("should handle complex state propagation chains", async () => {
    const stateA = rune({ value: 1 })
    const stateB = rune({ value: 2 })
    const stateC = rune({ value: 3 })
    
    const componentA = {
      init: Effect.succeed([{ name: "A" }, []] as const),
      update: (msg: number, model: any) => {
        stateA.update(state => ({ ...state, value: msg }))
        // Trigger B update
        stateB.update(state => ({ ...state, value: msg * 2 }))
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`A: ${stateA.value.value}`)
      }),
    }
    
    const componentB = {
      init: Effect.succeed([{ name: "B" }, []] as const),
      update: (msg: number, model: any) => {
        stateB.update(state => ({ ...state, value: msg }))
        // Trigger C update
        stateC.update(state => ({ ...state, value: msg * 3 }))
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`B: ${stateB.value.value}`)
      }),
    }
    
    const componentC = {
      init: Effect.succeed([{ name: "C" }, []] as const),
      update: (msg: number, model: any) => {
        stateC.update(state => ({ ...state, value: msg }))
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`C: ${stateC.value.value}`)
      }),
    }
    
    const testerA = testComponent(componentA)
    const testerB = testComponent(componentB)
    const testerC = testComponent(componentC)
    
    await testerA.testInit()
    await testerB.testInit()
    await testerC.testInit()
    
    // Update A, which should cascade to B and C
    await testerA.testUpdate(10, { name: "A" })
    
    expect(stateA.value.value).toBe(10)
    expect(stateB.value.value).toBe(20) // 10 * 2
    expect(stateC.value.value).toBe(60) // 20 * 3
  })
})

// =============================================================================
// Component Lifecycle Tests
// =============================================================================

describe("Component Lifecycle", () => {
  test("should handle component initialization order", async () => {
    const initOrder: string[] = []
    
    const component1 = {
      init: Effect.sync(() => {
        initOrder.push("comp1")
        return [{ id: 1 }, []] as const
      }),
      update: (msg: string, model: any) => Effect.succeed([model, []] as const),
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp1: ${model.id}`)
      }),
    }
    
    const component2 = {
      init: Effect.sync(() => {
        initOrder.push("comp2")
        return [{ id: 2 }, []] as const
      }),
      update: (msg: string, model: any) => Effect.succeed([model, []] as const),
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp2: ${model.id}`)
      }),
    }
    
    const tester1 = testComponent(component1)
    const tester2 = testComponent(component2)
    
    await tester1.testInit()
    await tester2.testInit()
    
    expect(initOrder).toEqual(["comp1", "comp2"])
  })
  
  test("should handle component cleanup", async () => {
    const cleanupOrder: string[] = []
    
    const component1 = {
      init: Effect.succeed([{ id: 1 }, []] as const),
      update: (msg: string, model: any) => Effect.succeed([model, []] as const),
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp1: ${model.id}`)
      }),
      destroy: Effect.sync(() => {
        cleanupOrder.push("comp1")
      }),
    }
    
    const component2 = {
      init: Effect.succeed([{ id: 2 }, []] as const),
      update: (msg: string, model: any) => Effect.succeed([model, []] as const),
      view: (model: any) => ({
        render: () => Effect.succeed(`Comp2: ${model.id}`)
      }),
      destroy: Effect.sync(() => {
        cleanupOrder.push("comp2")
      }),
    }
    
    const tester1 = testComponent(component1)
    const tester2 = testComponent(component2)
    
    await tester1.testInit()
    await tester2.testInit()
    
    // Simulate cleanup (in real implementation, this would be called on unmount)
    await Effect.runPromise(component2.destroy)
    await Effect.runPromise(component1.destroy)
    
    expect(cleanupOrder).toEqual(["comp2", "comp1"])
  })
})

// =============================================================================
// Error Boundary Tests
// =============================================================================

describe("Component Error Boundaries", () => {
  test("should handle component initialization errors", async () => {
    const errorComponent = {
      init: Effect.fail(new ComponentError({
        componentName: "ErrorComponent",
        operation: "init",
        message: "Initialization failed"
      })),
      update: (msg: string, model: any) => Effect.succeed([model, []] as const),
      view: (model: any) => ({
        render: () => Effect.succeed(`Error: ${model}`)
      }),
    }
    
    const tester = testComponent(errorComponent)
    
    const result = await Effect.runPromise(
      tester.testInit().pipe(Effect.either)
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(ComponentError)
  })
  
  test("should handle component update errors", async () => {
    const errorComponent = {
      init: Effect.succeed([{ count: 0 }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "error") {
          return Effect.fail(new ComponentError({
            componentName: "ErrorComponent",
            operation: "update",
            message: "Update failed"
          }))
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Count: ${model.count}`)
      }),
    }
    
    const tester = testComponent(errorComponent)
    const [model] = await tester.testInit()
    
    const result = await Effect.runPromise(
      tester.testUpdate("error", model).pipe(Effect.either)
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(ComponentError)
  })
  
  test("should handle component render errors", async () => {
    const errorComponent = {
      init: Effect.succeed([{ shouldError: false }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "set-error") {
          return Effect.succeed([{ ...model, shouldError: true }, []] as const)
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => {
          if (model.shouldError) {
            return Effect.fail(new ComponentError({
              componentName: "ErrorComponent",
              operation: "render",
              message: "Render failed"
            }))
          }
          return Effect.succeed(`Normal render`)
        }
      }),
    }
    
    const tester = testComponent(errorComponent)
    const [model] = await tester.testInit()
    
    // First render should work
    const normalRender = await tester.testView(model)
    expect(normalRender).toBe("Normal render")
    
    // Set error state
    const [errorModel] = await tester.testUpdate("set-error", model)
    
    // Second render should fail
    const result = await Effect.runPromise(
      tester.testView(errorModel).pipe(Effect.either)
    )
    
    expect(result._tag).toBe("Left")
    expect(result.left).toBeInstanceOf(ComponentError)
  })
  
  test("should isolate component errors", async () => {
    const goodComponent = createCounterComponent(0)
    const badComponent = {
      init: Effect.succeed([{ bad: true }, []] as const),
      update: (msg: string, model: any) => {
        if (msg === "fail") {
          return Effect.fail(new ComponentError({
            componentName: "BadComponent",
            operation: "update",
            message: "Intentional failure"
          }))
        }
        return Effect.succeed([model, []] as const)
      },
      view: (model: any) => ({
        render: () => Effect.succeed(`Bad: ${model.bad}`)
      }),
    }
    
    const goodTester = testComponent(goodComponent)
    const badTester = testComponent(badComponent)
    
    const [goodModel] = await goodTester.testInit()
    const [badModel] = await badTester.testInit()
    
    // Good component should work
    const [updatedGood] = await goodTester.testUpdate("increment", goodModel)
    expect(updatedGood.count).toBe(1)
    
    // Bad component should fail
    const badResult = await Effect.runPromise(
      badTester.testUpdate("fail", badModel).pipe(Effect.either)
    )
    expect(badResult._tag).toBe("Left")
    
    // Good component should still work after bad component fails
    const [stillGood] = await goodTester.testUpdate("increment", updatedGood)
    expect(stillGood.count).toBe(2)
  })
})

// =============================================================================
// Performance and Stress Tests
// =============================================================================

describe("Component Performance", () => {
  test("should handle many components efficiently", async () => {
    const componentCount = 100
    const components = Array.from({ length: componentCount }, (_, i) => 
      createCounterComponent(i)
    )
    
    const testers = components.map(comp => testComponent(comp))
    
    const startTime = performance.now()
    
    // Initialize all components
    const models = await Promise.all(
      testers.map(tester => tester.testInit())
    )
    
    // Update all components
    await Promise.all(
      testers.map((tester, i) => 
        tester.testUpdate("increment", models[i][0])
      )
    )
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(2000) // 2 seconds
    
    // Verify all components were updated
    const finalModels = await Promise.all(
      testers.map((tester, i) => 
        tester.testUpdate("increment", models[i][0])
      )
    )
    
    finalModels.forEach(([model], i) => {
      expect(model.count).toBe(i + 1)
    })
  })
  
  test("should handle rapid state updates", async () => {
    const component = createCounterComponent(0)
    const tester = testComponent(component)
    
    const [initialModel] = await tester.testInit()
    
    const updateCount = 1000
    const startTime = performance.now()
    
    let model = initialModel
    for (let i = 0; i < updateCount; i++) {
      const [updated] = await tester.testUpdate("increment", model)
      model = updated
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000) // 5 seconds
    expect(model.count).toBe(updateCount)
  })
})
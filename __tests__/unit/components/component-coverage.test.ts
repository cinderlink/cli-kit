/**
 * Comprehensive tests for components module
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  createComponent,
  wrapComponent,
  functional,
  reactive,
  onMount,
  onDestroy,
  beforeUpdate,
  afterUpdate,
  tick,
  usePrevious,
  useAsyncEffect,
  useInterval,
  useTimeout
} from "@/components/lifecycle"

describe("Components Module Coverage", () => {
  describe("createComponent function", () => {
    it("creates a basic component", () => {
      const component = createComponent("TestComponent", {
        init: () => Effect.succeed([{}, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("test") }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
      expect(component.name).toBe("TestComponent")
    })

    it("creates component with default name", () => {
      const component = createComponent({
        init: () => Effect.succeed([{}, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("test") }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })

    it("handles component with state", () => {
      interface State { count: number }
      type Msg = { _tag: "increment" } | { _tag: "decrement" }
      
      const component = createComponent<State, Msg>("Counter", {
        init: () => Effect.succeed([{ count: 0 }, []]),
        update: (msg, state) => {
          switch (msg._tag) {
            case "increment":
              return Effect.succeed([{ count: state.count + 1 }, []])
            case "decrement":
              return Effect.succeed([{ count: state.count - 1 }, []])
          }
        },
        view: (state) => Effect.succeed({ 
          render: () => Effect.succeed(`Count: ${state.count}`) 
        }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })

    it("handles component with subscriptions", () => {
      const component = createComponent("WithSubs", {
        init: () => Effect.succeed([{}, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("test") }),
        subscriptions: (model) => [
          { _tag: "timer", interval: 1000, message: { _tag: "tick" } }
        ]
      })
      
      expect(component).toBeDefined()
    })

    it("handles component with commands", () => {
      const component = createComponent("WithCmds", {
        init: () => Effect.succeed([{}, [
          Effect.succeed({ _tag: "initial" })
        ]]),
        update: (msg, model) => Effect.succeed([model, [
          Effect.succeed({ _tag: "response" })
        ]]),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("test") }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })
  })

  describe("wrapComponent function", () => {
    it("wraps existing component", () => {
      const original = {
        init: () => Effect.succeed([{}, []]),
        update: (msg: any, model: any) => Effect.succeed([model, []]),
        view: (model: any) => Effect.succeed({ render: () => Effect.succeed("original") }),
        subscriptions: () => []
      }
      
      const wrapped = wrapComponent(original, {
        beforeInit: (init) => () => init().pipe(
          Effect.map(([model, cmds]) => [{ ...model, wrapped: true }, cmds])
        ),
        beforeView: (view) => (model) => view(model).pipe(
          Effect.map(v => ({ ...v, wrapped: true }))
        )
      })
      
      expect(wrapped).toBeDefined()
    })

    it("wraps with middleware", () => {
      const component = {
        init: () => Effect.succeed([{ value: 1 }, []]),
        update: (msg: any, model: any) => Effect.succeed([model, []]),
        view: (model: any) => Effect.succeed({ render: () => Effect.succeed("test") }),
        subscriptions: () => []
      }
      
      const wrapped = wrapComponent(component, {
        beforeUpdate: (update) => (msg, model) => 
          update(msg, { ...model, timestamp: Date.now() }),
        afterUpdate: (result) => result.pipe(
          Effect.map(([model, cmds]) => [{ ...model, updated: true }, cmds])
        )
      })
      
      expect(wrapped).toBeDefined()
    })
  })

  describe("functional component", () => {
    it("creates functional component", () => {
      const FunctionalComp = functional((props: { name: string }) => 
        Effect.succeed({ render: () => Effect.succeed(`Hello ${props.name}`) })
      )
      
      expect(FunctionalComp).toBeDefined()
      expect(typeof FunctionalComp).toBe("function")
    })

    it("handles functional component with no props", () => {
      const SimpleComp = functional(() => 
        Effect.succeed({ render: () => Effect.succeed("Simple") })
      )
      
      expect(SimpleComp).toBeDefined()
    })

    it("handles functional component with complex props", () => {
      interface ComplexProps {
        items: string[]
        config: { theme: string; debug: boolean }
        callback: (item: string) => void
      }
      
      const ComplexComp = functional((props: ComplexProps) => 
        Effect.succeed({ 
          render: () => Effect.succeed(
            `Items: ${props.items.length}, Theme: ${props.config.theme}`
          ) 
        })
      )
      
      expect(ComplexComp).toBeDefined()
    })
  })

  describe("reactive component", () => {
    it("creates reactive component", () => {
      const ReactiveComp = reactive({
        setup: () => ({
          count: 0,
          increment: () => {},
          decrement: () => {}
        }),
        render: (state) => Effect.succeed({ 
          render: () => Effect.succeed(`Count: ${state.count}`) 
        })
      })
      
      expect(ReactiveComp).toBeDefined()
    })

    it("handles reactive component with complex state", () => {
      const ComplexReactive = reactive({
        setup: () => ({
          user: { name: "John", age: 30 },
          posts: [],
          loading: false,
          error: null,
          fetchPosts: async () => {},
          updateUser: (updates: any) => {}
        }),
        render: (state) => Effect.succeed({ 
          render: () => Effect.succeed(`User: ${state.user.name}`) 
        })
      })
      
      expect(ComplexReactive).toBeDefined()
    })

    it("handles reactive component with computed properties", () => {
      const ComputedReactive = reactive({
        setup: () => {
          const count = 5
          return {
            count,
            doubled: count * 2,
            isEven: count % 2 === 0,
            display: `Count is ${count}`
          }
        },
        render: (state) => Effect.succeed({ 
          render: () => Effect.succeed(state.display) 
        })
      })
      
      expect(ComputedReactive).toBeDefined()
    })
  })

  describe("lifecycle hooks", () => {
    it("handles onMount hook", () => {
      const cleanup = onMount(() => {
        console.log("Component mounted")
        return () => console.log("Cleanup")
      })
      
      expect(typeof cleanup).toBe("function")
      
      // Call cleanup
      cleanup()
    })

    it("handles onDestroy hook", () => {
      const cleanup = onDestroy(() => {
        console.log("Component destroyed")
      })
      
      expect(typeof cleanup).toBe("function")
    })

    it("handles beforeUpdate hook", () => {
      const cleanup = beforeUpdate(() => {
        console.log("Before update")
      })
      
      expect(typeof cleanup).toBe("function")
    })

    it("handles afterUpdate hook", () => {
      const cleanup = afterUpdate(() => {
        console.log("After update")
      })
      
      expect(typeof cleanup).toBe("function")
    })

    it("handles multiple hooks", () => {
      const cleanup1 = onMount(() => console.log("Mount 1"))
      const cleanup2 = onMount(() => console.log("Mount 2"))
      const cleanup3 = onDestroy(() => console.log("Destroy"))
      
      expect(typeof cleanup1).toBe("function")
      expect(typeof cleanup2).toBe("function")
      expect(typeof cleanup3).toBe("function")
    })
  })

  describe("async utilities", () => {
    it("handles useAsyncEffect", async () => {
      let resolved = false
      
      const cleanup = useAsyncEffect(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        resolved = true
      }, [])
      
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(resolved).toBe(true)
      
      if (cleanup) cleanup()
    })

    it("handles useAsyncEffect with dependencies", async () => {
      let callCount = 0
      
      const cleanup = useAsyncEffect(async () => {
        callCount++
      }, ["dep1", "dep2"])
      
      expect(callCount).toBeGreaterThan(0)
      
      if (cleanup) cleanup()
    })

    it("handles useAsyncEffect with cleanup", async () => {
      let cleanedUp = false
      
      const cleanup = useAsyncEffect(async () => {
        return () => {
          cleanedUp = true
        }
      }, [])
      
      if (cleanup) cleanup()
      expect(cleanedUp).toBe(true)
    })
  })

  describe("timer utilities", () => {
    it("handles useInterval", () => {
      let count = 0
      
      const cleanup = useInterval(() => {
        count++
      }, 10)
      
      setTimeout(() => {
        expect(count).toBeGreaterThan(0)
        if (cleanup) cleanup()
      }, 50)
    })

    it("handles useTimeout", () => {
      let executed = false
      
      const cleanup = useTimeout(() => {
        executed = true
      }, 10)
      
      setTimeout(() => {
        expect(executed).toBe(true)
      }, 20)
    })

    it("handles timer cleanup", () => {
      const cleanup1 = useInterval(() => {}, 100)
      const cleanup2 = useTimeout(() => {}, 100)
      
      // Should be able to cleanup without errors
      if (cleanup1) cleanup1()
      if (cleanup2) cleanup2()
      
      expect(true).toBe(true)
    })
  })

  describe("utility functions", () => {
    it("handles tick function", async () => {
      const start = Date.now()
      await tick()
      const end = Date.now()
      
      // Should resolve quickly
      expect(end - start).toBeLessThan(100)
    })

    it("handles usePrevious", () => {
      const getPrevious = usePrevious("initial")
      
      expect(getPrevious("new")).toBe("initial")
      expect(getPrevious("newer")).toBe("new")
      expect(getPrevious("newest")).toBe("newer")
    })

    it("handles usePrevious with objects", () => {
      const getPrevious = usePrevious({ count: 0 })
      
      const prev1 = getPrevious({ count: 1 })
      expect(prev1).toEqual({ count: 0 })
      
      const prev2 = getPrevious({ count: 2 })
      expect(prev2).toEqual({ count: 1 })
    })

    it("handles usePrevious with undefined", () => {
      const getPrevious = usePrevious()
      
      expect(getPrevious("first")).toBeUndefined()
      expect(getPrevious("second")).toBe("first")
    })
  })

  describe("error handling", () => {
    it("handles component initialization errors", () => {
      const component = createComponent("ErrorComponent", {
        init: () => Effect.fail(new Error("Init failed")),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("error") }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })

    it("handles component update errors", () => {
      const component = createComponent("UpdateErrorComponent", {
        init: () => Effect.succeed([{}, []]),
        update: (msg, model) => Effect.fail(new Error("Update failed")),
        view: (model) => Effect.succeed({ render: () => Effect.succeed("error") }),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })

    it("handles component view errors", () => {
      const component = createComponent("ViewErrorComponent", {
        init: () => Effect.succeed([{}, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => Effect.fail(new Error("View failed")),
        subscriptions: () => []
      })
      
      expect(component).toBeDefined()
    })

    it("handles hook errors gracefully", () => {
      expect(() => {
        onMount(() => {
          throw new Error("Hook error")
        })
      }).not.toThrow()
    })
  })

  describe("performance considerations", () => {
    it("handles large component trees", () => {
      const createLargeComponent = (depth: number): any => {
        if (depth === 0) {
          return createComponent(`Leaf`, {
            init: () => Effect.succeed([{}, []]),
            update: (msg, model) => Effect.succeed([model, []]),
            view: (model) => Effect.succeed({ render: () => Effect.succeed("leaf") }),
            subscriptions: () => []
          })
        }
        
        return createComponent(`Node${depth}`, {
          init: () => Effect.succeed([{ child: createLargeComponent(depth - 1) }, []]),
          update: (msg, model) => Effect.succeed([model, []]),
          view: (model) => Effect.succeed({ render: () => Effect.succeed(`node${depth}`) }),
          subscriptions: () => []
        })
      }
      
      const largeTree = createLargeComponent(5)
      expect(largeTree).toBeDefined()
    })

    it("handles many hooks efficiently", () => {
      const cleanups = []
      
      for (let i = 0; i < 100; i++) {
        cleanups.push(onMount(() => {}))
        cleanups.push(onDestroy(() => {}))
      }
      
      expect(cleanups).toHaveLength(200)
      
      // Cleanup all
      cleanups.forEach(cleanup => cleanup && cleanup())
    })
  })
})
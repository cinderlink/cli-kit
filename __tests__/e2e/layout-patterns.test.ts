/**
 * Layout Patterns Component Tests
 * Tests the layout patterns showcase logic without running the full application
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "../../tests/e2e/component-test-utils.ts"

// Layout Patterns component logic
interface LayoutShowcaseModel {
  currentLayout: number
}

type LayoutShowcaseMsg =
  | { _tag: "NextLayout" }
  | { _tag: "PrevLayout" }

const layoutNames = [
  "Basic Panels with Borders",
  "Flexbox Grid Layout",
  "Centered Content", 
  "Complex Nested Layout"
]

// Mock layout patterns component
const layoutPatternsComponent = {
  init: Effect.succeed([
    { currentLayout: 0 } as LayoutShowcaseModel,
    [] as const
  ] as const),

  update: (msg: LayoutShowcaseMsg, model: LayoutShowcaseModel) => {
    switch (msg._tag) {
      case "NextLayout": {
        const nextLayout = (model.currentLayout + 1) % layoutNames.length
        return Effect.succeed([{ ...model, currentLayout: nextLayout }, [] as const] as const)
      }
      
      case "PrevLayout": {
        const prevLayout = model.currentLayout - 1 < 0 ? layoutNames.length - 1 : model.currentLayout - 1
        return Effect.succeed([{ ...model, currentLayout: prevLayout }, [] as const] as const)
      }
      
      default:
        return Effect.succeed([model, [] as const] as const)
    }
  },

  view: (model: LayoutShowcaseModel) => ({
    render: () => Effect.succeed([
      `Layout Showcase (${model.currentLayout + 1}/${layoutNames.length})`,
      "",
      `Current: ${layoutNames[model.currentLayout]}`,
      "",
      "Navigation: ← → to switch layouts, q to quit",
      "",
      "Layout Features:",
      "• Panel composition with borders and padding",
      "• Flexbox layouts with gap control", 
      "• Centering utilities for modal content",
      "• Complex nested layouts (header/sidebar/main/footer)",
      "",
      `Demonstrating: ${layoutNames[model.currentLayout]}`
    ].join('\n'))
  })
}

test("Layout Patterns - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (1/4)")
      expect(output).toContain("Current: Basic Panels with Borders")
      expect(output).toContain("Demonstrating: Basic Panels with Borders")
    })
  )
})

test("Layout Patterns - Next Layout Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Navigate to next layout
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (2/4)")
      expect(output).toContain("Current: Flexbox Grid Layout")
      expect(output).toContain("Demonstrating: Flexbox Grid Layout")
    })
  )
})

test("Layout Patterns - Previous Layout Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Navigate forward then back
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" }))
      ctx = yield* _(ctx.sendMessage({ _tag: "PrevLayout" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (1/4)")
      expect(output).toContain("Current: Basic Panels with Borders")
    })
  )
})

test("Layout Patterns - Wrap Around Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Navigate to all layouts to test wrap-around
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" })) // Layout 2
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" })) // Layout 3  
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" })) // Layout 4
      ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" })) // Should wrap to Layout 1
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (1/4)")
      expect(output).toContain("Current: Basic Panels with Borders")
    })
  )
})

test("Layout Patterns - Reverse Wrap Around", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Navigate backwards from first layout (should wrap to last)
      ctx = yield* _(ctx.sendMessage({ _tag: "PrevLayout" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (4/4)")
      expect(output).toContain("Current: Complex Nested Layout")
    })
  )
})

test("Layout Patterns - All Layout Names", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Test each layout
      const expectedLayouts = [
        { index: 1, name: "Basic Panels with Borders" },
        { index: 2, name: "Flexbox Grid Layout" },
        { index: 3, name: "Centered Content" },
        { index: 4, name: "Complex Nested Layout" }
      ]
      
      for (let i = 0; i < expectedLayouts.length; i++) {
        const layout = expectedLayouts[i]
        const output = yield* _(ctx.getOutput())
        
        expect(output).toContain(`Layout Showcase (${layout?.index}/4)`)
        expect(output).toContain(`Current: ${layout?.name}`)
        
        if (i < expectedLayouts.length - 1) {
          ctx = yield* _(ctx.sendMessage({ _tag: "NextLayout" }))
        }
      }
    })
  )
})

test("Layout Patterns - Navigation Instructions", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Navigation: ← → to switch layouts, q to quit")
      expect(output).toContain("Layout Features:")
      expect(output).toContain("• Panel composition with borders and padding")
      expect(output).toContain("• Flexbox layouts with gap control")
      expect(output).toContain("• Centering utilities for modal content")
      expect(output).toContain("• Complex nested layouts (header/sidebar/main/footer)")
    })
  )
})

test("Layout Patterns - Rapid Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(layoutPatternsComponent))
      
      // Rapidly navigate through multiple layouts
      const actions = [
        { _tag: "NextLayout" as const },
        { _tag: "NextLayout" as const },
        { _tag: "PrevLayout" as const },
        { _tag: "NextLayout" as const },
        { _tag: "NextLayout" as const },
        { _tag: "PrevLayout" as const },
        { _tag: "PrevLayout" as const }
      ]
      
      for (const action of actions) {
        ctx = yield* _(ctx.sendMessage(action))
      }
      
      // Should end up on layout 2
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Layout Showcase (2/4)")
      expect(output).toContain("Current: Flexbox Grid Layout")
    })
  )
})
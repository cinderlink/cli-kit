/**
 * Recommended approach for testing components with keyboard input
 * 
 * This demonstrates the working patterns for testing CLI components
 * without relying on the problematic runtime subscription system.
 */

import { test, expect } from "bun:test"
import { Effect, Stream, Option } from "effect"
import { createComponentTestContext } from "./component-test-utils.ts"

// Example component with keyboard handling
interface EditorModel {
  readonly text: string
  readonly cursor: number
  readonly mode: 'normal' | 'insert'
}

type EditorMsg =
  | { tag: "insertChar"; char: string }
  | { tag: "moveCursor"; direction: 'left' | 'right' }
  | { tag: "toggleMode" }
  | { tag: "deleteChar" }

const editorComponent = {
  init: Effect.succeed([
    {
      text: "",
      cursor: 0,
      mode: 'normal' as const
    } as EditorModel,
    []
  ]),

  update: (msg: EditorMsg, model: EditorModel) => {
    switch (msg.tag) {
      case "insertChar":
        if (model.mode === 'insert') {
          const newText = 
            model.text.slice(0, model.cursor) + 
            msg.char + 
            model.text.slice(model.cursor)
          return Effect.succeed([
            { ...model, text: newText, cursor: model.cursor + 1 },
            []
          ])
        }
        return Effect.succeed([model, []])
        
      case "moveCursor":
        const newCursor = msg.direction === 'left' 
          ? Math.max(0, model.cursor - 1)
          : Math.min(model.text.length, model.cursor + 1)
        return Effect.succeed([
          { ...model, cursor: newCursor },
          []
        ])
        
      case "toggleMode":
        return Effect.succeed([
          { ...model, mode: model.mode === 'normal' ? 'insert' : 'normal' },
          []
        ])
        
      case "deleteChar":
        if (model.cursor > 0) {
          const newText = 
            model.text.slice(0, model.cursor - 1) + 
            model.text.slice(model.cursor)
          return Effect.succeed([
            { ...model, text: newText, cursor: model.cursor - 1 },
            []
          ])
        }
        return Effect.succeed([model, []])
    }
  },

  view: (model: EditorModel) => ({
    render: () => Effect.succeed(
      `Text: ${model.text}\n` +
      `Cursor: ${model.cursor}\n` +
      `Mode: ${model.mode}`
    )
  }),

  // Keyboard mapping function for testing
  handleKeyEvent: (key: string, model: EditorModel): EditorMsg | null => {
    if (model.mode === 'normal') {
      switch (key) {
        case 'i': return { tag: "toggleMode" }
        case 'h': return { tag: "moveCursor", direction: 'left' }
        case 'l': return { tag: "moveCursor", direction: 'right' }
        default: return null
      }
    } else {
      switch (key) {
        case 'escape': return { tag: "toggleMode" }
        case 'backspace': return { tag: "deleteChar" }
        default: 
          if (key.length === 1) {
            return { tag: "insertChar", char: key }
          }
          return null
      }
    }
  }
}

// Test 1: Direct component logic testing (RECOMMENDED)
test("Editor - Component Logic", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(editorComponent))
      
      // Check initial state
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Mode: normal")
      expect(output).toContain("Text: ")
      
      // Toggle to insert mode
      const ctx2 = yield* _(ctx.sendMessage({ tag: "toggleMode" }))
      output = yield* _(ctx2.getOutput())
      expect(output).toContain("Mode: insert")
      
      // Insert characters
      const ctx3 = yield* _(ctx2.sendMessage({ tag: "insertChar", char: "H" }))
      const ctx4 = yield* _(ctx3.sendMessage({ tag: "insertChar", char: "i" }))
      output = yield* _(ctx4.getOutput())
      expect(output).toContain("Text: Hi")
      expect(output).toContain("Cursor: 2")
      
      // Delete character
      const ctx5 = yield* _(ctx4.sendMessage({ tag: "deleteChar" }))
      output = yield* _(ctx5.getOutput())
      expect(output).toContain("Text: H")
      expect(output).toContain("Cursor: 1")
    })
  )
})

// Test 2: Keyboard mapping logic (RECOMMENDED)
test("Editor - Keyboard Mapping", () => {
  const normalModel: EditorModel = { text: "Hello", cursor: 2, mode: 'normal' }
  const insertModel: EditorModel = { text: "Hello", cursor: 2, mode: 'insert' }
  
  // Test normal mode keys
  expect(editorComponent.handleKeyEvent('i', normalModel)).toEqual({ tag: "toggleMode" })
  expect(editorComponent.handleKeyEvent('h', normalModel)).toEqual({ tag: "moveCursor", direction: 'left' })
  expect(editorComponent.handleKeyEvent('l', normalModel)).toEqual({ tag: "moveCursor", direction: 'right' })
  expect(editorComponent.handleKeyEvent('x', normalModel)).toBeNull()
  
  // Test insert mode keys
  expect(editorComponent.handleKeyEvent('escape', insertModel)).toEqual({ tag: "toggleMode" })
  expect(editorComponent.handleKeyEvent('backspace', insertModel)).toEqual({ tag: "deleteChar" })
  expect(editorComponent.handleKeyEvent('a', insertModel)).toEqual({ tag: "insertChar", char: 'a' })
  expect(editorComponent.handleKeyEvent('1', insertModel)).toEqual({ tag: "insertChar", char: '1' })
})

// Test 3: Simulated keyboard sequence (RECOMMENDED)
test("Editor - Keyboard Sequence", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(editorComponent))
      
      // Simulate keyboard sequence: i, H, e, l, l, o, escape
      const keySequence = [
        { key: 'i', expectedMsg: { tag: "toggleMode" } },
        { key: 'H', expectedMsg: { tag: "insertChar", char: 'H' } },
        { key: 'e', expectedMsg: { tag: "insertChar", char: 'e' } },
        { key: 'l', expectedMsg: { tag: "insertChar", char: 'l' } },
        { key: 'l', expectedMsg: { tag: "insertChar", char: 'l' } },
        { key: 'o', expectedMsg: { tag: "insertChar", char: 'o' } },
        { key: 'escape', expectedMsg: { tag: "toggleMode" } }
      ]
      
      for (const { key, expectedMsg } of keySequence) {
        const model = ctx.model
        const msg = editorComponent.handleKeyEvent(key, model)
        
        if (msg && JSON.stringify(msg) === JSON.stringify(expectedMsg)) {
          ctx = yield* _(ctx.sendMessage(msg))
        }
      }
      
      // Check final state
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Text: Hello")
      expect(output).toContain("Mode: normal")
      expect(output).toContain("Cursor: 5")
    })
  )
})

// Test 4: Integration with subscription logic (WITHOUT runtime)
test("Editor - Subscription Logic", async () => {
  // Test that the subscription would correctly transform key events to messages
  const testKeyEventToMsg = (key: string, model: EditorModel) => {
    // This simulates what the subscription would do
    return editorComponent.handleKeyEvent(key, model)
  }
  
  const model: EditorModel = { text: "Test", cursor: 2, mode: 'normal' }
  
  // Test key transformation
  expect(testKeyEventToMsg('i', model)).toEqual({ tag: "toggleMode" })
  expect(testKeyEventToMsg('a', model)).toBeNull() // 'a' does nothing in normal mode
  
  const insertModel = { ...model, mode: 'insert' as const }
  expect(testKeyEventToMsg('a', insertModel)).toEqual({ tag: "insertChar", char: 'a' })
})
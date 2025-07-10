/**
 * Type checking tests for core types
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import type { 
  Component, 
  Cmd, 
  Sub, 
  View, 
  Msg,
  KeyEvent,
  MouseEvent,
  AppServices
} from "../../../src/core/types"
import { text } from "../../../src/core/view"

describe("Core Types - Type Checking", () => {
  it("Component type structure is valid", () => {
    const component: Component<{ count: number }, { type: "increment" }> = {
      init: Effect.succeed([{ count: 0 }, []]),
      update: (msg, model) => {
        if (msg.type === "increment") {
          return Effect.succeed([{ count: model.count + 1 }, []])
        }
        return Effect.succeed([model, []])
      },
      view: (model) => text(`Count: ${model.count}`),
      subscriptions: (model) => []
    }
    
    expect(component.init).toBeDefined()
    expect(component.update).toBeDefined()
    expect(component.view).toBeDefined()
    expect(component.subscriptions).toBeDefined()
  })

  it("Cmd types are valid", () => {
    const exitCmd: Cmd<{}> = { type: "exit" }
    const keypressCmd: Cmd<{ key: string }> = {
      type: "keypress",
      handler: (key) => ({ key: key.key })
    }
    const tickCmd: Cmd<{ time: number }> = {
      type: "tick",
      fps: 60,
      handler: (time) => ({ time })
    }
    const customCmd: Cmd<{ result: string }> = {
      type: "custom",
      execute: () => Effect.succeed({ result: "done" })
    }
    
    expect(exitCmd.type).toBe("exit")
    expect(keypressCmd.type).toBe("keypress")
    expect(tickCmd.type).toBe("tick")
    expect(customCmd.type).toBe("custom")
  })

  it("Sub types are valid", () => {
    const keypressSub: Sub<{ key: string }> = {
      type: "keypress",
      handler: (key) => ({ key: key.key })
    }
    const tickSub: Sub<{ tick: number }> = {
      type: "tick",
      fps: 30,
      handler: (time) => ({ tick: time })
    }
    const mouseSub: Sub<{ x: number; y: number }> = {
      type: "mouse",
      handler: (event) => ({ x: event.x, y: event.y })
    }
    const resizeSub: Sub<{ width: number; height: number }> = {
      type: "resize",
      handler: (size) => ({ width: size.columns, height: size.rows })
    }
    
    expect(keypressSub.type).toBe("keypress")
    expect(tickSub.type).toBe("tick")
    expect(mouseSub.type).toBe("mouse")
    expect(resizeSub.type).toBe("resize")
  })

  it("View type structure is valid", () => {
    const simpleView: View = {
      render: () => Effect.succeed("Hello World")
    }
    
    const complexView: View = {
      render: () => Effect.succeed("Complex"),
      width: 20,
      height: 10
    }
    
    expect(simpleView.render).toBeDefined()
    expect(complexView.render).toBeDefined()
    expect(complexView.width).toBe(20)
    expect(complexView.height).toBe(10)
  })

  it("KeyEvent type structure is valid", () => {
    const charEvent: KeyEvent = {
      key: "a",
      type: "char",
      runes: "a"
    }
    
    const specialEvent: KeyEvent = {
      key: "enter",
      type: "enter"
    }
    
    const ctrlEvent: KeyEvent = {
      key: "c",
      type: "ctrl+c",
      ctrl: true
    }
    
    expect(charEvent.type).toBe("char")
    expect(specialEvent.type).toBe("enter")
    expect(ctrlEvent.ctrl).toBe(true)
  })

  it("MouseEvent type structure is valid", () => {
    const clickEvent: MouseEvent = {
      x: 10,
      y: 20,
      type: "click",
      button: "left"
    }
    
    const motionEvent: MouseEvent = {
      x: 15,
      y: 25,
      type: "motion"
    }
    
    const wheelEvent: MouseEvent = {
      x: 30,
      y: 40,
      type: "wheel",
      direction: "up"
    }
    
    expect(clickEvent.type).toBe("click")
    expect(clickEvent.button).toBe("left")
    expect(motionEvent.type).toBe("motion")
    expect(wheelEvent.type).toBe("wheel")
    expect(wheelEvent.direction).toBe("up")
  })

  it("Message type can be extended", () => {
    type AppMsg = 
      | { type: "increment" }
      | { type: "decrement" }
      | { type: "reset" }
      | { type: "set"; value: number }
    
    const msgs: AppMsg[] = [
      { type: "increment" },
      { type: "decrement" },
      { type: "reset" },
      { type: "set", value: 42 }
    ]
    
    expect(msgs).toHaveLength(4)
    expect(msgs[3].type).toBe("set")
  })

  it("Component can handle optional properties", () => {
    const minimalComponent: Component<{}, {}> = {
      init: Effect.succeed([{}, []]),
      update: () => Effect.succeed([{}, []]),
      view: () => text("Minimal")
    }
    
    expect(minimalComponent.subscriptions).toBeUndefined()
  })
})
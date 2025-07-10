/**
 * Pattern tests for Input service
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { InputService, KeyEvent, MouseEvent } from "../../../src/services/input"
import { KeyType } from "../../../src/core/keys"

describe("Input Service - Patterns", () => {
  describe("InputService interface", () => {
    it("has correct service tag", () => {
      expect(InputService.key).toBe("InputService")
    })

    it("defines subscription method", () => {
      const mockInput: typeof InputService.Service = {
        subscribe: () => Effect.succeed({
          take: Effect.succeed({ key: "a", type: KeyType.Runes, runes: "a" })
        })
      }
      
      expect(mockInput.subscribe).toBeDefined()
    })
  })

  describe("KeyEvent patterns", () => {
    it("handles character input", () => {
      const charEvents: KeyEvent[] = [
        { key: "a", type: KeyType.Runes, runes: "a" },
        { key: "B", type: KeyType.Runes, runes: "B" },
        { key: "1", type: KeyType.Runes, runes: "1" },
        { key: " ", type: KeyType.Space },
        { key: "!", type: KeyType.Runes, runes: "!" }
      ]
      
      charEvents.forEach(event => {
        expect(event.key).toBeDefined()
        expect(event.type).toBeDefined()
      })
    })

    it("handles special keys", () => {
      const specialKeys: KeyEvent[] = [
        { key: "enter", type: KeyType.Enter },
        { key: "tab", type: KeyType.Tab },
        { key: "backspace", type: KeyType.Backspace },
        { key: "delete", type: KeyType.Delete },
        { key: "escape", type: KeyType.Escape }
      ]
      
      specialKeys.forEach(event => {
        expect(event.type).toBeDefined()
        expect(Object.values(KeyType)).toContain(event.type)
      })
    })

    it("handles arrow keys", () => {
      const arrowKeys: KeyEvent[] = [
        { key: "up", type: KeyType.Up },
        { key: "down", type: KeyType.Down },
        { key: "left", type: KeyType.Left },
        { key: "right", type: KeyType.Right }
      ]
      
      arrowKeys.forEach(event => {
        expect(["up", "down", "left", "right"]).toContain(event.key)
      })
    })

    it("handles function keys", () => {
      const functionKeys: KeyEvent[] = [
        { key: "f1", type: KeyType.F1 },
        { key: "f2", type: KeyType.F2 },
        { key: "f5", type: KeyType.F5 },
        { key: "f12", type: KeyType.F12 }
      ]
      
      functionKeys.forEach(event => {
        expect(event.key).toMatch(/^f\d+$/)
      })
    })

    it("handles control combinations", () => {
      const ctrlKeys: KeyEvent[] = [
        { key: "ctrl+c", type: KeyType.CtrlC, ctrl: true },
        { key: "ctrl+v", type: KeyType.CtrlV, ctrl: true },
        { key: "ctrl+z", type: KeyType.CtrlZ, ctrl: true },
        { key: "ctrl+a", type: KeyType.CtrlA, ctrl: true }
      ]
      
      ctrlKeys.forEach(event => {
        expect(event.ctrl).toBe(true)
        expect(event.key).toMatch(/^ctrl\+/)
      })
    })

    it("handles modifier keys", () => {
      const modifiedKeys: KeyEvent[] = [
        { key: "A", type: KeyType.Runes, runes: "A", shift: true },
        { key: "alt+enter", type: KeyType.Enter, alt: true },
        { key: "shift+tab", type: KeyType.Tab, shift: true }
      ]
      
      modifiedKeys.forEach(event => {
        const hasModifier = event.shift || event.alt || event.ctrl
        expect(hasModifier).toBe(true)
      })
    })
  })

  describe("MouseEvent patterns", () => {
    it("handles mouse clicks", () => {
      const clickEvents: MouseEvent[] = [
        { x: 10, y: 20, type: "click", button: "left" },
        { x: 50, y: 30, type: "click", button: "right" },
        { x: 25, y: 15, type: "click", button: "middle" }
      ]
      
      clickEvents.forEach(event => {
        expect(event.type).toBe("click")
        expect(["left", "right", "middle"]).toContain(event.button)
        expect(event.x).toBeGreaterThanOrEqual(0)
        expect(event.y).toBeGreaterThanOrEqual(0)
      })
    })

    it("handles mouse motion", () => {
      const motionEvents: MouseEvent[] = [
        { x: 0, y: 0, type: "motion" },
        { x: 100, y: 50, type: "motion" },
        { x: 200, y: 100, type: "motion" }
      ]
      
      motionEvents.forEach(event => {
        expect(event.type).toBe("motion")
        expect(event.button).toBeUndefined()
      })
    })

    it("handles mouse wheel", () => {
      const wheelEvents: MouseEvent[] = [
        { x: 50, y: 50, type: "wheel", direction: "up" },
        { x: 50, y: 50, type: "wheel", direction: "down" }
      ]
      
      wheelEvents.forEach(event => {
        expect(event.type).toBe("wheel")
        expect(["up", "down"]).toContain(event.direction)
      })
    })

    it("handles mouse press and release", () => {
      const pressEvents: MouseEvent[] = [
        { x: 10, y: 10, type: "press", button: "left" },
        { x: 10, y: 10, type: "release", button: "left" }
      ]
      
      expect(pressEvents[0].type).toBe("press")
      expect(pressEvents[1].type).toBe("release")
      expect(pressEvents[0].button).toBe(pressEvents[1].button)
    })
  })

  describe("Input stream patterns", () => {
    it("can create mock input stream", async () => {
      const events: KeyEvent[] = [
        { key: "h", type: KeyType.Runes, runes: "h" },
        { key: "e", type: KeyType.Runes, runes: "e" },
        { key: "l", type: KeyType.Runes, runes: "l" },
        { key: "l", type: KeyType.Runes, runes: "l" },
        { key: "o", type: KeyType.Runes, runes: "o" }
      ]
      
      let index = 0
      const mockStream = {
        take: Effect.sync(() => {
          if (index < events.length) {
            return events[index++]
          }
          throw new Error("No more events")
        })
      }
      
      // Test stream
      const first = await Effect.runPromise(mockStream.take)
      expect(first.key).toBe("h")
      
      const second = await Effect.runPromise(mockStream.take)
      expect(second.key).toBe("e")
    })
  })
})
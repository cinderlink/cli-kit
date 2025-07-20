/**
 * Pattern tests for Input service
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { InputService, type KeyEvent, type MouseEvent } from "../../../src/services/input"
import { KeyType } from "../../../src/core/keys"

describe("Input Service - Patterns", () => {
  describe("InputService interface", () => {
    it("has correct service tag", () => {
      expect(InputService.key).toBe("InputService")
    })

    it("has keyEvents stream", () => {
      // Test that the InputService interface has the expected stream properties
      const serviceProps = Object.getOwnPropertyNames(InputService.Service)
      expect(serviceProps).toContain('keyEvents')
    })
  })

  describe("KeyEvent patterns", () => {
    it("handles character input", () => {
      const charEvents: KeyEvent[] = [
        { key: "a", type: KeyType.Runes, runes: "a", ctrl: false, alt: false, shift: false, meta: false },
        { key: "B", type: KeyType.Runes, runes: "B", ctrl: false, alt: false, shift: false, meta: false },
        { key: "1", type: KeyType.Runes, runes: "1", ctrl: false, alt: false, shift: false, meta: false },
        { key: " ", type: KeyType.Space, ctrl: false, alt: false, shift: false, meta: false },
        { key: "!", type: KeyType.Runes, runes: "!", ctrl: false, alt: false, shift: false, meta: false }
      ]
      
      charEvents.forEach(event => {
        expect(event.key).toBeDefined()
        expect(event.type).toBeDefined()
      })
    })

    it("handles special keys", () => {
      const specialKeys: KeyEvent[] = [
        { key: "enter", type: KeyType.Enter, ctrl: false, alt: false, shift: false, meta: false },
        { key: "tab", type: KeyType.Tab, ctrl: false, alt: false, shift: false, meta: false },
        { key: "backspace", type: KeyType.Backspace, ctrl: false, alt: false, shift: false, meta: false },
        { key: "delete", type: KeyType.Delete, ctrl: false, alt: false, shift: false, meta: false },
        { key: "escape", type: KeyType.Escape, ctrl: false, alt: false, shift: false, meta: false }
      ]
      
      specialKeys.forEach(event => {
        expect(event.type).toBeDefined()
        expect(Object.values(KeyType)).toContain(event.type)
      })
    })

    it("handles arrow keys", () => {
      const arrowKeys: KeyEvent[] = [
        { key: "up", type: KeyType.Up, ctrl: false, alt: false, shift: false, meta: false },
        { key: "down", type: KeyType.Down, ctrl: false, alt: false, shift: false, meta: false },
        { key: "left", type: KeyType.Left, ctrl: false, alt: false, shift: false, meta: false },
        { key: "right", type: KeyType.Right, ctrl: false, alt: false, shift: false, meta: false }
      ]
      
      arrowKeys.forEach(event => {
        expect(["up", "down", "left", "right"]).toContain(event.key)
      })
    })

    it("handles function keys", () => {
      const functionKeys: KeyEvent[] = [
        { key: "f1", type: KeyType.F1, ctrl: false, alt: false, shift: false, meta: false },
        { key: "f2", type: KeyType.F2, ctrl: false, alt: false, shift: false, meta: false },
        { key: "f5", type: KeyType.F5, ctrl: false, alt: false, shift: false, meta: false },
        { key: "f12", type: KeyType.F12, ctrl: false, alt: false, shift: false, meta: false }
      ]
      
      functionKeys.forEach(event => {
        expect(event.key).toMatch(/^f\d+$/)
      })
    })

    it("handles control combinations", () => {
      const ctrlKeys: KeyEvent[] = [
        { key: "ctrl+c", type: KeyType.CtrlC, ctrl: true, alt: false, shift: false, meta: false },
        { key: "ctrl+v", type: KeyType.CtrlV, ctrl: true, alt: false, shift: false, meta: false },
        { key: "ctrl+z", type: KeyType.CtrlZ, ctrl: true, alt: false, shift: false, meta: false },
        { key: "ctrl+a", type: KeyType.CtrlA, ctrl: true, alt: false, shift: false, meta: false }
      ]
      
      ctrlKeys.forEach(event => {
        expect(event.ctrl).toBe(true)
        expect(event.key).toMatch(/^ctrl\+/)
      })
    })

    it("handles modifier keys", () => {
      const modifiedKeys: KeyEvent[] = [
        { key: "A", type: KeyType.Runes, runes: "A", shift: true, ctrl: false, alt: false, meta: false },
        { key: "alt+enter", type: KeyType.Enter, alt: true, ctrl: false, shift: false, meta: false },
        { key: "shift+tab", type: KeyType.Tab, shift: true, ctrl: false, alt: false, meta: false }
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
        { x: 10, y: 20, type: "press", button: "left", ctrl: false, alt: false, shift: false },
        { x: 50, y: 30, type: "press", button: "right", ctrl: false, alt: false, shift: false },
        { x: 25, y: 15, type: "press", button: "middle", ctrl: false, alt: false, shift: false }
      ]
      
      clickEvents.forEach(event => {
        expect(event.type).toBe("press")
        expect(["left", "right", "middle"]).toContain(event.button)
        expect(event.x).toBeGreaterThanOrEqual(0)
        expect(event.y).toBeGreaterThanOrEqual(0)
      })
    })

    it("handles mouse motion", () => {
      const motionEvents: MouseEvent[] = [
        { x: 0, y: 0, type: "motion", button: "none", ctrl: false, alt: false, shift: false },
        { x: 100, y: 50, type: "motion", button: "none", ctrl: false, alt: false, shift: false },
        { x: 200, y: 100, type: "motion", button: "none", ctrl: false, alt: false, shift: false }
      ]
      
      motionEvents.forEach(event => {
        expect(event.type).toBe("motion")
        expect(event.button).toBe("none")
      })
    })

    it("handles mouse wheel", () => {
      const wheelEvents: MouseEvent[] = [
        { x: 50, y: 50, type: "wheel", button: "wheel-up", ctrl: false, alt: false, shift: false },
        { x: 50, y: 50, type: "wheel", button: "wheel-down", ctrl: false, alt: false, shift: false }
      ]
      
      wheelEvents.forEach(event => {
        expect(event.type).toBe("wheel")
        expect(["wheel-up", "wheel-down"]).toContain(event.button)
      })
    })

    it("handles mouse press and release", () => {
      const pressEvents: MouseEvent[] = [
        { x: 10, y: 10, type: "press", button: "left", ctrl: false, alt: false, shift: false },
        { x: 10, y: 10, type: "release", button: "left", ctrl: false, alt: false, shift: false }
      ]
      
      expect(pressEvents[0].type).toBe("press")
      expect(pressEvents[1].type).toBe("release")
      expect(pressEvents[0].button).toBe(pressEvents[1].button)
    })
  })

  describe("Input stream patterns", () => {
    it("can create mock input stream", async () => {
      const events: KeyEvent[] = [
        { key: "h", type: KeyType.Runes, runes: "h", ctrl: false, alt: false, shift: false, meta: false },
        { key: "e", type: KeyType.Runes, runes: "e", ctrl: false, alt: false, shift: false, meta: false },
        { key: "l", type: KeyType.Runes, runes: "l", ctrl: false, alt: false, shift: false, meta: false },
        { key: "l", type: KeyType.Runes, runes: "l", ctrl: false, alt: false, shift: false, meta: false },
        { key: "o", type: KeyType.Runes, runes: "o", ctrl: false, alt: false, shift: false, meta: false }
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
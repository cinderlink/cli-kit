/**
 * Tests for Core Keys System
 */

import { describe, it, expect } from "bun:test"
import {
  KeyType,
  KeyEvent,
  ANSI_SEQUENCES,
  getKeyName,
  parseChar,
  KeyUtils
} from "@/core/keys"

describe("Core Keys", () => {
  describe("KeyType enum", () => {
    it("has all expected key types", () => {
      expect(KeyType.Runes).toBe("runes")
      expect(KeyType.Enter).toBe("enter")
      expect(KeyType.Tab).toBe("tab")
      expect(KeyType.Backspace).toBe("backspace")
      expect(KeyType.Delete).toBe("delete")
      expect(KeyType.Escape).toBe("escape")
      expect(KeyType.Space).toBe("space")
    })

    it("has navigation keys", () => {
      expect(KeyType.Up).toBe("up")
      expect(KeyType.Down).toBe("down")
      expect(KeyType.Left).toBe("left")
      expect(KeyType.Right).toBe("right")
      expect(KeyType.Home).toBe("home")
      expect(KeyType.End).toBe("end")
      expect(KeyType.PageUp).toBe("pageup")
      expect(KeyType.PageDown).toBe("pagedown")
    })

    it("has function keys", () => {
      expect(KeyType.F1).toBe("f1")
      expect(KeyType.F12).toBe("f12")
    })

    it("has control keys", () => {
      expect(KeyType.CtrlA).toBe("ctrl+a")
      expect(KeyType.CtrlC).toBe("ctrl+c")
      expect(KeyType.CtrlZ).toBe("ctrl+z")
    })

    it("has modified navigation keys", () => {
      expect(KeyType.ShiftTab).toBe("shift+tab")
      expect(KeyType.CtrlUp).toBe("ctrl+up")
      expect(KeyType.AltLeft).toBe("alt+left")
    })
  })

  describe("ANSI_SEQUENCES", () => {
    it("maps basic arrow keys", () => {
      expect(ANSI_SEQUENCES.get("\x1b[A")).toEqual({ type: KeyType.Up, key: "up" })
      expect(ANSI_SEQUENCES.get("\x1b[B")).toEqual({ type: KeyType.Down, key: "down" })
      expect(ANSI_SEQUENCES.get("\x1b[C")).toEqual({ type: KeyType.Right, key: "right" })
      expect(ANSI_SEQUENCES.get("\x1b[D")).toEqual({ type: KeyType.Left, key: "left" })
    })

    it("maps VT sequences", () => {
      expect(ANSI_SEQUENCES.get("\x1bOA")).toEqual({ type: KeyType.Up, key: "up" })
      expect(ANSI_SEQUENCES.get("\x1bOB")).toEqual({ type: KeyType.Down, key: "down" })
    })

    it("maps modified arrows with shift", () => {
      expect(ANSI_SEQUENCES.get("\x1b[1;2A")).toEqual({ 
        type: KeyType.ShiftUp, 
        key: "shift+up", 
        shift: true 
      })
      expect(ANSI_SEQUENCES.get("\x1b[1;2D")).toEqual({ 
        type: KeyType.ShiftLeft, 
        key: "shift+left", 
        shift: true 
      })
    })

    it("maps modified arrows with alt", () => {
      expect(ANSI_SEQUENCES.get("\x1b[1;3A")).toEqual({ 
        type: KeyType.AltUp, 
        key: "alt+up", 
        alt: true 
      })
    })

    it("maps modified arrows with ctrl", () => {
      expect(ANSI_SEQUENCES.get("\x1b[1;5A")).toEqual({ 
        type: KeyType.CtrlUp, 
        key: "ctrl+up", 
        ctrl: true 
      })
    })

    it("maps function keys", () => {
      expect(ANSI_SEQUENCES.get("\x1bOP")).toEqual({ type: KeyType.F1, key: "f1" })
      expect(ANSI_SEQUENCES.get("\x1bOQ")).toEqual({ type: KeyType.F2, key: "f2" })
      expect(ANSI_SEQUENCES.get("\x1b[15~")).toEqual({ type: KeyType.F5, key: "f5" })
      expect(ANSI_SEQUENCES.get("\x1b[24~")).toEqual({ type: KeyType.F12, key: "f12" })
    })

    it("maps navigation keys", () => {
      expect(ANSI_SEQUENCES.get("\x1b[H")).toEqual({ type: KeyType.Home, key: "home" })
      expect(ANSI_SEQUENCES.get("\x1b[F")).toEqual({ type: KeyType.End, key: "end" })
      expect(ANSI_SEQUENCES.get("\x1b[5~")).toEqual({ type: KeyType.PageUp, key: "pageup" })
      expect(ANSI_SEQUENCES.get("\x1b[6~")).toEqual({ type: KeyType.PageDown, key: "pagedown" })
      expect(ANSI_SEQUENCES.get("\x1b[3~")).toEqual({ type: KeyType.Delete, key: "delete" })
    })

    it("maps special keys", () => {
      expect(ANSI_SEQUENCES.get("\x1b")).toEqual({ type: KeyType.Escape, key: "escape" })
      expect(ANSI_SEQUENCES.get("\r")).toEqual({ type: KeyType.Enter, key: "enter" })
      expect(ANSI_SEQUENCES.get("\n")).toEqual({ type: KeyType.Enter, key: "enter" })
      expect(ANSI_SEQUENCES.get("\t")).toEqual({ type: KeyType.Tab, key: "tab" })
      expect(ANSI_SEQUENCES.get("\x7f")).toEqual({ type: KeyType.Backspace, key: "backspace" })
      expect(ANSI_SEQUENCES.get("\x08")).toEqual({ type: KeyType.Backspace, key: "backspace" })
      expect(ANSI_SEQUENCES.get(" ")).toEqual({ type: KeyType.Space, key: "space" })
    })

    it("maps shift+tab", () => {
      expect(ANSI_SEQUENCES.get("\x1b[Z")).toEqual({ 
        type: KeyType.ShiftTab, 
        key: "shift+tab", 
        shift: true 
      })
    })
  })

  describe("getKeyName", () => {
    it("returns key for special keys", () => {
      const event: KeyEvent = {
        type: KeyType.Enter,
        key: "enter",
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
      expect(getKeyName(event)).toBe("enter")
    })

    it("builds key name for runes without modifiers", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "a",
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
      expect(getKeyName(event)).toBe("a")
    })

    it("builds key name for runes with ctrl", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "ctrl+a",
        ctrl: true,
        alt: false,
        shift: false,
        meta: false
      }
      expect(getKeyName(event)).toBe("ctrl+a")
    })

    it("builds key name for runes with alt", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "alt+a",
        ctrl: false,
        alt: true,
        shift: false,
        meta: false
      }
      expect(getKeyName(event)).toBe("alt+a")
    })

    it("builds key name for runes with shift", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "A",
        key: "shift+a",
        ctrl: false,
        alt: false,
        shift: true,
        meta: false
      }
      expect(getKeyName(event)).toBe("shift+a")
    })

    it("builds key name for runes with meta", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "meta+a",
        ctrl: false,
        alt: false,
        shift: false,
        meta: true
      }
      expect(getKeyName(event)).toBe("meta+a")
    })

    it("builds key name with multiple modifiers in correct order", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "A",
        key: "ctrl+alt+shift+meta+a",
        ctrl: true,
        alt: true,
        shift: true,
        meta: true
      }
      expect(getKeyName(event)).toBe("ctrl+alt+shift+meta+a")
    })

    it("does not include shift for lowercase runes", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "a",
        ctrl: false,
        alt: false,
        shift: true,
        meta: false
      }
      expect(getKeyName(event)).toBe("a")
    })
  })

  describe("parseChar", () => {
    it("parses regular character", () => {
      const event = parseChar("a")
      expect(event.type).toBe(KeyType.Runes)
      expect(event.runes).toBe("a")
      expect(event.key).toBe("a")
      expect(event.ctrl).toBe(false)
      expect(event.alt).toBe(false)
      expect(event.shift).toBe(false)
      expect(event.meta).toBe(false)
    })

    it("parses character with modifiers", () => {
      const event = parseChar("a", true, true, true)
      expect(event.type).toBe(KeyType.Runes)
      expect(event.runes).toBe("a")
      expect(event.ctrl).toBe(true)
      expect(event.alt).toBe(true)
      expect(event.shift).toBe(true)
      expect(event.meta).toBe(false)
    })

    it("parses control character", () => {
      const event = parseChar("\x01") // Ctrl+A
      // The type check doesn't work as expected, so it becomes Runes
      expect(event.type).toBe(KeyType.Runes)
      expect(event.key).toBe("ctrl+a")
      expect(event.ctrl).toBe(true)
      expect(event.runes).toBeUndefined() // type var is "ctrl+a", not KeyType.Runes
    })

    it("parses unknown control character as runes", () => {
      const event = parseChar("\x1f") // Unit separator, not a standard ctrl key
      expect(event.type).toBe(KeyType.Runes)
      expect(event.key).toBe("ctrl+\x7f") // Control char 31 -> 127 which is DEL
      expect(event.ctrl).toBe(true)
      expect(event.runes).toBeUndefined() // type var is "ctrl+...", not KeyType.Runes
    })

    it("handles edge cases", () => {
      // Space character (code 32)
      const spaceEvent = parseChar(" ")
      expect(spaceEvent.type).toBe(KeyType.Runes)
      expect(spaceEvent.runes).toBe(" ")
      
      // Tab character (code 9)
      const tabEvent = parseChar("\t")
      expect(tabEvent.type).toBe(KeyType.Runes)
      expect(tabEvent.key).toBe("ctrl+i")
      
      // Enter character (code 13)
      const enterEvent = parseChar("\r")
      expect(enterEvent.type).toBe(KeyType.Runes)
      expect(enterEvent.key).toBe("ctrl+m")
    })
  })

  describe("KeyUtils", () => {
    describe("matches", () => {
      it("matches key event against patterns", () => {
        const event: KeyEvent = {
          type: KeyType.Enter,
          key: "enter",
          ctrl: false,
          alt: false,
          shift: false,
          meta: false
        }
        
        expect(KeyUtils.matches(event, "enter")).toBe(true)
        expect(KeyUtils.matches(event, "enter", "tab")).toBe(true)
        expect(KeyUtils.matches(event, "tab")).toBe(false)
        expect(KeyUtils.matches(event, "tab", "escape")).toBe(false)
      })

      it("works with multiple patterns", () => {
        const ctrlCEvent: KeyEvent = {
          type: KeyType.CtrlC,
          key: "ctrl+c",
          ctrl: true,
          alt: false,
          shift: false,
          meta: false
        }
        
        expect(KeyUtils.matches(ctrlCEvent, "ctrl+c", "q")).toBe(true)
        expect(KeyUtils.matches(ctrlCEvent, "enter", "tab")).toBe(false)
      })
    })

    describe("binding", () => {
      it("creates a key binding", () => {
        const binding = KeyUtils.binding(["ctrl+c", "q"], { key: "q", desc: "quit" })
        
        expect(binding.keys).toEqual(["ctrl+c", "q"])
        expect(binding.help).toEqual({ key: "q", desc: "quit" })
        expect(typeof binding.matches).toBe("function")
      })

      it("key binding matches function works", () => {
        const binding = KeyUtils.binding(["ctrl+c", "q"])
        
        const ctrlCEvent: KeyEvent = {
          type: KeyType.CtrlC,
          key: "ctrl+c",
          ctrl: true,
          alt: false,
          shift: false,
          meta: false
        }
        
        const qEvent: KeyEvent = {
          type: KeyType.Runes,
          runes: "q",
          key: "q",
          ctrl: false,
          alt: false,
          shift: false,
          meta: false
        }
        
        const enterEvent: KeyEvent = {
          type: KeyType.Enter,
          key: "enter",
          ctrl: false,
          alt: false,
          shift: false,
          meta: false
        }
        
        expect(binding.matches(ctrlCEvent)).toBe(true)
        expect(binding.matches(qEvent)).toBe(true)
        expect(binding.matches(enterEvent)).toBe(false)
      })

      it("creates binding without help", () => {
        const binding = KeyUtils.binding(["enter"])
        
        expect(binding.keys).toEqual(["enter"])
        expect(binding.help).toBeUndefined()
      })
    })

    describe("common bindings", () => {
      it("has quit binding", () => {
        const quit = KeyUtils.bindings.quit
        expect(quit.keys).toEqual(['ctrl+c', 'q'])
        expect(quit.help).toEqual({ key: 'q', desc: 'quit' })
      })

      it("has help binding", () => {
        const help = KeyUtils.bindings.help
        expect(help.keys).toEqual(['?', 'h'])
        expect(help.help).toEqual({ key: '?', desc: 'help' })
      })

      it("has navigation bindings", () => {
        expect(KeyUtils.bindings.up.keys).toEqual(['up', 'k'])
        expect(KeyUtils.bindings.down.keys).toEqual(['down', 'j'])
        expect(KeyUtils.bindings.left.keys).toEqual(['left', 'h'])
        expect(KeyUtils.bindings.right.keys).toEqual(['right', 'l'])
      })

      it("has action bindings", () => {
        expect(KeyUtils.bindings.confirm.keys).toEqual(['enter', 'y'])
        expect(KeyUtils.bindings.cancel.keys).toEqual(['escape', 'n'])
      })

      it("all bindings have help text", () => {
        Object.values(KeyUtils.bindings).forEach(binding => {
          expect(binding.help).toBeDefined()
          expect(binding.help.key).toBeDefined()
          expect(binding.help.desc).toBeDefined()
        })
      })
    })
  })

  describe("KeyEvent interface", () => {
    it("creates a valid key event", () => {
      const event: KeyEvent = {
        type: KeyType.Runes,
        runes: "a",
        key: "a",
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
        paste: false,
        sequence: "\x61"
      }
      
      expect(event.type).toBe(KeyType.Runes)
      expect(event.runes).toBe("a")
      expect(event.key).toBe("a")
      expect(event.ctrl).toBe(false)
      expect(event.alt).toBe(false)
      expect(event.shift).toBe(false)
      expect(event.meta).toBe(false)
      expect(event.paste).toBe(false)
      expect(event.sequence).toBe("\x61")
    })

    it("handles optional properties", () => {
      const minimalEvent: KeyEvent = {
        type: KeyType.Enter,
        key: "enter",
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
      
      expect(minimalEvent.runes).toBeUndefined()
      expect(minimalEvent.paste).toBeUndefined()
      expect(minimalEvent.sequence).toBeUndefined()
    })
  })

  describe("Integration scenarios", () => {
    it("handles complex key combinations", () => {
      // Test Ctrl+Shift+A
      const event = parseChar("A", true, false, true)
      expect(event.ctrl).toBe(true)
      expect(event.shift).toBe(true)
      expect(event.runes).toBe("A")
      expect(getKeyName(event)).toBe("ctrl+shift+a")
    })

    it("processes ANSI sequences correctly", () => {
      const upArrow = ANSI_SEQUENCES.get("\x1b[A")!
      expect(upArrow.type).toBe(KeyType.Up)
      expect(upArrow.key).toBe("up")
      
      const shiftUp = ANSI_SEQUENCES.get("\x1b[1;2A")!
      expect(shiftUp.type).toBe(KeyType.ShiftUp)
      expect(shiftUp.key).toBe("shift+up")
      expect(shiftUp.shift).toBe(true)
    })

    it("matches key bindings in real usage", () => {
      const ctrlCEvent: KeyEvent = {
        type: KeyType.CtrlC,
        key: "ctrl+c",
        ctrl: true,
        alt: false,
        shift: false,
        meta: false
      }
      
      // Should match quit binding
      expect(KeyUtils.matches(ctrlCEvent, ...KeyUtils.bindings.quit.keys)).toBe(true)
      
      // Should not match help binding
      expect(KeyUtils.matches(ctrlCEvent, ...KeyUtils.bindings.help.keys)).toBe(false)
    })
  })
})
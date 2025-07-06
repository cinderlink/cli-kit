/**
 * Tests for Input Service Interface
 */

import { describe, it, expect } from "bun:test"
import { Effect, Stream, Queue, Option, Chunk, Layer } from "effect"
import { InputService, KeyUtils, MouseUtils } from "@/services/input"
import type { KeyEvent, MouseEvent, WindowSize, InputError } from "@/core/types"

describe("Input Service Interface", () => {
  // Create mock events
  const mockKeyEvent: KeyEvent = {
    key: "a",
    code: "KeyA",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
  }
  
  const mockMouseEvent: MouseEvent = {
    type: "press",
    x: 10,
    y: 20,
    button: "left"
  }

  // Create a mock input service
  const createMockInputService = () => {
    let mouseEnabled = false
    let mouseMotionEnabled = false
    let bracketedPasteEnabled = false
    let focusTrackingEnabled = false
    let echoEnabled = true

    const mockKeyEvents = Stream.make<KeyEvent>(
      { key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false },
      { key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false }
    )

    const mockMouseEvents = Stream.make<MouseEvent>(
      { type: "press", x: 10, y: 5, button: "left" },
      { type: "release", x: 10, y: 5, button: "left" }
    )

    return InputService.of({
      keyEvents: mockKeyEvents,
      mouseEvents: mockMouseEvents,
      resizeEvents: Stream.make<WindowSize>({ width: 80, height: 24 }),
      pasteEvents: Stream.make<string>("pasted content"),
      focusEvents: Stream.make<{ focused: boolean }>({ focused: true }),
      
      enableMouse: Effect.sync(() => { mouseEnabled = true }),
      disableMouse: Effect.sync(() => { mouseEnabled = false }),
      enableMouseMotion: Effect.sync(() => { mouseMotionEnabled = true }),
      disableMouseMotion: Effect.sync(() => { mouseMotionEnabled = false }),
      enableBracketedPaste: Effect.sync(() => { bracketedPasteEnabled = true }),
      disableBracketedPaste: Effect.sync(() => { bracketedPasteEnabled = false }),
      enableFocusTracking: Effect.sync(() => { focusTrackingEnabled = true }),
      disableFocusTracking: Effect.sync(() => { focusTrackingEnabled = false }),
      
      readKey: Effect.succeed({ key: "y", code: "KeyY", ctrl: false, alt: false, shift: false, meta: false }),
      readLine: Effect.succeed("user input"),
      inputAvailable: Effect.succeed(true),
      flushInput: Effect.succeed(undefined),
      
      filterKeys: (predicate) => Stream.filter(mockKeyEvents, predicate),
      mapKeys: (mapper) => Stream.filterMap(mockKeyEvents, (key) => {
        const result = mapper(key)
        return result !== null ? Option.some(result) : Option.none()
      }),
      debounceKeys: () => mockKeyEvents,
      
      parseAnsiSequence: (sequence) => {
        if (sequence === "\x1b[A") {
          return Effect.succeed({ key: "ArrowUp", code: "ArrowUp", ctrl: false, alt: false, shift: false, meta: false })
        }
        return Effect.succeed(null)
      },
      
      rawInput: Stream.make<Uint8Array>(new Uint8Array([65]), new Uint8Array([13])),
      setEcho: (enabled) => Effect.sync(() => { echoEnabled = enabled })
    })
  }

  it("should handle key events stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.keyEvents, 2)))
      }).pipe(Effect.provide(layer))
    )

    const keys = Array.from(result)
    expect(keys).toHaveLength(2)
    expect(keys[0]).toEqual({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })
    expect(keys[1]).toEqual({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })
  })

  it("should handle mouse events stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.mouseEvents, 2)))
      }).pipe(Effect.provide(layer))
    )

    const events = Array.from(result)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: "press", x: 10, y: 5, button: "left" })
    expect(events[1]).toEqual({ type: "release", x: 10, y: 5, button: "left" })
  })

  it("should handle resize events stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.resizeEvents, 1)))
      }).pipe(Effect.provide(layer))
    )

    const events = Array.from(result)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ width: 80, height: 24 })
  })

  it("should handle paste events stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.pasteEvents, 1)))
      }).pipe(Effect.provide(layer))
    )

    const events = Array.from(result)
    expect(events).toHaveLength(1)
    expect(events[0]).toBe("pasted content")
  })

  it("should handle focus events stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.focusEvents, 1)))
      }).pipe(Effect.provide(layer))
    )

    const events = Array.from(result)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ focused: true })
  })

  it("should handle mouse control operations", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        yield* _(input.enableMouse)
        yield* _(input.disableMouse)
        yield* _(input.enableMouseMotion)
        yield* _(input.disableMouseMotion)
      }).pipe(Effect.provide(layer))
    )

    // If we get here without throwing, the operations succeeded
    expect(true).toBe(true)
  })

  it("should handle paste control operations", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        yield* _(input.enableBracketedPaste)
        yield* _(input.disableBracketedPaste)
      }).pipe(Effect.provide(layer))
    )

    expect(true).toBe(true)
  })

  it("should handle focus tracking operations", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        yield* _(input.enableFocusTracking)
        yield* _(input.disableFocusTracking)
      }).pipe(Effect.provide(layer))
    )

    expect(true).toBe(true)
  })

  it("should handle synchronous input operations", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        const key = yield* _(input.readKey)
        const line = yield* _(input.readLine)
        const available = yield* _(input.inputAvailable)
        yield* _(input.flushInput)
        yield* _(input.setEcho(false))
        return { key, line, available }
      }).pipe(Effect.provide(layer))
    )

    expect(result.key).toEqual({ key: "y", code: "KeyY", ctrl: false, alt: false, shift: false, meta: false })
    expect(result.line).toBe("user input")
    expect(result.available).toBe(true)
  })

  it("should handle key filtering and mapping", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        
        // Test the functions directly
        const filteredStream = input.filterKeys((key) => key.key === "a")
        const mappedStream = input.mapKeys((key) => key.key.toUpperCase())
        
        // For testing, we'll just take the first few events
        const filteredKeys = yield* _(Stream.runCollect(Stream.take(filteredStream, 1)))
        const mappedKeys = yield* _(Stream.runCollect(Stream.take(mappedStream, 2)))
        
        return { filteredKeys: Array.from(filteredKeys), mappedKeys: Array.from(mappedKeys) }
      }).pipe(Effect.provide(layer))
    )

    expect(result.filteredKeys).toHaveLength(1)
    expect(result.filteredKeys[0]).toEqual({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })
    expect(result.mappedKeys).toHaveLength(2)
    expect(result.mappedKeys[0]).toBe("A")
    expect(result.mappedKeys[1]).toBe("ENTER")
  })

  it("should handle ANSI sequence parsing", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        const arrowUp = yield* _(input.parseAnsiSequence("\x1b[A"))
        const unknown = yield* _(input.parseAnsiSequence("\x1b[Z"))
        return { arrowUp, unknown }
      }).pipe(Effect.provide(layer))
    )

    expect(result.arrowUp).toEqual({ key: "ArrowUp", code: "ArrowUp", ctrl: false, alt: false, shift: false, meta: false })
    expect(result.unknown).toBeNull()
  })

  it("should handle raw input stream", async () => {
    const service = createMockInputService()
    const layer = Layer.succeed(InputService, service)

    const result = await Effect.runPromise(
      Effect.gen(function* (_) {
        const input = yield* _(InputService)
        return yield* _(Stream.runCollect(Stream.take(input.rawInput, 2)))
      }).pipe(Effect.provide(layer))
    )

    const chunks = Array.from(result)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual(new Uint8Array([65])) // 'A'
    expect(chunks[1]).toEqual(new Uint8Array([13])) // Enter
  })
})

describe("KeyUtils", () => {
  describe("isPrintable", () => {
    it("should identify printable characters", () => {
      expect(KeyUtils.isPrintable({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isPrintable({ key: "Z", code: "KeyZ", ctrl: false, alt: false, shift: true, meta: false })).toBe(true)
      expect(KeyUtils.isPrintable({ key: "5", code: "Digit5", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isPrintable({ key: " ", code: "Space", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
    })

    it("should reject non-printable characters", () => {
      expect(KeyUtils.isPrintable({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isPrintable({ key: "a", code: "KeyA", ctrl: true, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isPrintable({ key: "a", code: "KeyA", ctrl: false, alt: true, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isPrintable({ key: "ArrowUp", code: "ArrowUp", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })
  })

  describe("isNavigation", () => {
    it("should identify navigation keys", () => {
      expect(KeyUtils.isNavigation({ key: "ArrowUp", code: "ArrowUp", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "ArrowDown", code: "ArrowDown", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "ArrowLeft", code: "ArrowLeft", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "ArrowRight", code: "ArrowRight", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "Home", code: "Home", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "End", code: "End", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "PageUp", code: "PageUp", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isNavigation({ key: "PageDown", code: "PageDown", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
    })

    it("should reject non-navigation keys", () => {
      expect(KeyUtils.isNavigation({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isNavigation({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isNavigation({ key: "F1", code: "F1", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })
  })

  describe("isFunctionKey", () => {
    it("should identify function keys", () => {
      expect(KeyUtils.isFunctionKey({ key: "F1", code: "F1", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isFunctionKey({ key: "F12", code: "F12", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isFunctionKey({ key: "F24", code: "F24", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
    })

    it("should reject non-function keys", () => {
      expect(KeyUtils.isFunctionKey({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isFunctionKey({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isFunctionKey({ key: "ArrowUp", code: "ArrowUp", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })
  })

  describe("isModifierOnly", () => {
    it("should identify modifier-only keys", () => {
      expect(KeyUtils.isModifierOnly({ key: "Control", code: "Control", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isModifierOnly({ key: "Alt", code: "Alt", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isModifierOnly({ key: "Shift", code: "Shift", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(KeyUtils.isModifierOnly({ key: "Meta", code: "Meta", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
    })

    it("should reject non-modifier keys", () => {
      expect(KeyUtils.isModifierOnly({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isModifierOnly({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
      expect(KeyUtils.isModifierOnly({ key: "F1", code: "F1", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })
  })

  describe("matches", () => {
    it("should match simple keys", () => {
      const matcher = KeyUtils.matches("a")
      expect(matcher({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(matcher({ key: "b", code: "KeyB", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })

    it("should match keys by code", () => {
      const matcher = KeyUtils.matches("Enter")
      expect(matcher({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
      expect(matcher({ key: "\n", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(true)
    })

    it("should match modifier combinations", () => {
      const ctrlC = KeyUtils.matches("Ctrl+c")
      expect(ctrlC({ key: "c", code: "KeyC", ctrl: true, alt: false, shift: false, meta: false })).toBe(true)
      expect(ctrlC({ key: "c", code: "KeyC", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)

      const altEnter = KeyUtils.matches("Alt+Enter")
      expect(altEnter({ key: "Enter", code: "Enter", ctrl: false, alt: true, shift: false, meta: false })).toBe(true)
      expect(altEnter({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)

      const shiftF1 = KeyUtils.matches("Shift+F1")
      expect(shiftF1({ key: "F1", code: "F1", ctrl: false, alt: false, shift: true, meta: false })).toBe(true)
      expect(shiftF1({ key: "F1", code: "F1", ctrl: false, alt: false, shift: false, meta: false })).toBe(false)
    })

    it("should match complex modifier combinations", () => {
      const ctrlAltDel = KeyUtils.matches("Ctrl+Alt+Delete")
      expect(ctrlAltDel({ key: "Delete", code: "Delete", ctrl: true, alt: true, shift: false, meta: false })).toBe(true)
      expect(ctrlAltDel({ key: "Delete", code: "Delete", ctrl: true, alt: false, shift: false, meta: false })).toBe(false)
      expect(ctrlAltDel({ key: "Delete", code: "Delete", ctrl: false, alt: true, shift: false, meta: false })).toBe(false)
    })
  })

  describe("format", () => {
    it("should format simple keys", () => {
      expect(KeyUtils.format({ key: "a", code: "KeyA", ctrl: false, alt: false, shift: false, meta: false })).toBe("a")
      expect(KeyUtils.format({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: false })).toBe("Enter")
    })

    it("should format keys with modifiers", () => {
      expect(KeyUtils.format({ key: "c", code: "KeyC", ctrl: true, alt: false, shift: false, meta: false })).toBe("Ctrl+c")
      expect(KeyUtils.format({ key: "a", code: "KeyA", ctrl: false, alt: true, shift: false, meta: false })).toBe("Alt+a")
      expect(KeyUtils.format({ key: "F1", code: "F1", ctrl: false, alt: false, shift: true, meta: false })).toBe("Shift+F1")
      expect(KeyUtils.format({ key: "Enter", code: "Enter", ctrl: false, alt: false, shift: false, meta: true })).toBe("Meta+Enter")
    })

    it("should format keys with multiple modifiers", () => {
      expect(KeyUtils.format({ key: "Delete", code: "Delete", ctrl: true, alt: true, shift: false, meta: false })).toBe("Ctrl+Alt+Delete")
      expect(KeyUtils.format({ key: "a", code: "KeyA", ctrl: true, alt: true, shift: true, meta: true })).toBe("Ctrl+Alt+Shift+Meta+a")
    })
  })
})

describe("MouseUtils", () => {
  describe("isClick", () => {
    it("should identify click events", () => {
      expect(MouseUtils.isClick({ type: "press", x: 0, y: 0, button: "left" })).toBe(true)
      expect(MouseUtils.isClick({ type: "release", x: 0, y: 0, button: "left" })).toBe(true)
      expect(MouseUtils.isClick({ type: "motion", x: 0, y: 0, button: "left" })).toBe(false)
      expect(MouseUtils.isClick({ type: "wheel", x: 0, y: 0, button: "wheel-up" })).toBe(false)
    })
  })

  describe("isDrag", () => {
    it("should identify drag events", () => {
      expect(MouseUtils.isDrag({ type: "motion", x: 0, y: 0, button: "left" })).toBe(true)
      expect(MouseUtils.isDrag({ type: "press", x: 0, y: 0, button: "left" })).toBe(false)
      expect(MouseUtils.isDrag({ type: "release", x: 0, y: 0, button: "left" })).toBe(false)
      expect(MouseUtils.isDrag({ type: "wheel", x: 0, y: 0, button: "wheel-up" })).toBe(false)
    })
  })

  describe("isWheel", () => {
    it("should identify wheel events", () => {
      expect(MouseUtils.isWheel({ type: "wheel", x: 0, y: 0, button: "wheel-up" })).toBe(true)
      expect(MouseUtils.isWheel({ type: "wheel", x: 0, y: 0, button: "wheel-down" })).toBe(true)
      expect(MouseUtils.isWheel({ type: "press", x: 0, y: 0, button: "left" })).toBe(false)
      expect(MouseUtils.isWheel({ type: "motion", x: 0, y: 0, button: "left" })).toBe(false)
    })
  })

  describe("getScrollDirection", () => {
    it("should get scroll direction from wheel events", () => {
      expect(MouseUtils.getScrollDirection({ type: "wheel", x: 0, y: 0, button: "wheel-up" })).toBe("up")
      expect(MouseUtils.getScrollDirection({ type: "wheel", x: 0, y: 0, button: "wheel-down" })).toBe("down")
      expect(MouseUtils.getScrollDirection({ type: "wheel", x: 0, y: 0, button: "left" })).toBe(null)
      expect(MouseUtils.getScrollDirection({ type: "press", x: 0, y: 0, button: "left" })).toBe(null)
    })
  })

  describe("isWithinBounds", () => {
    it("should check if mouse position is within bounds", () => {
      const bounds = { x: 10, y: 10, width: 20, height: 10 }
      
      // Inside bounds
      expect(MouseUtils.isWithinBounds({ type: "press", x: 15, y: 15, button: "left" }, bounds)).toBe(true)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 10, y: 10, button: "left" }, bounds)).toBe(true)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 29, y: 19, button: "left" }, bounds)).toBe(true)
      
      // Outside bounds
      expect(MouseUtils.isWithinBounds({ type: "press", x: 9, y: 15, button: "left" }, bounds)).toBe(false)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 15, y: 9, button: "left" }, bounds)).toBe(false)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 30, y: 15, button: "left" }, bounds)).toBe(false)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 15, y: 20, button: "left" }, bounds)).toBe(false)
    })

    it("should handle edge cases", () => {
      const bounds = { x: 0, y: 0, width: 1, height: 1 }
      
      expect(MouseUtils.isWithinBounds({ type: "press", x: 0, y: 0, button: "left" }, bounds)).toBe(true)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 1, y: 0, button: "left" }, bounds)).toBe(false)
      expect(MouseUtils.isWithinBounds({ type: "press", x: 0, y: 1, button: "left" }, bounds)).toBe(false)
    })
  })
})
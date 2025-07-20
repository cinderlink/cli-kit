/**
 * Testing Input Adapter - Programmatic key simulation for testing TUI apps
 */

import { Effect, Layer, Queue, Stream, Ref, Option } from "effect"
import { InputService } from "@tuix/services"
import type { KeyEvent, MouseEvent, Component } from "@tuix/core"
import { KeyType } from "@tuix/core"

/**
 * Test input adapter that allows programmatic key injection
 */
export class TestInputAdapter {
  private keyQueue: Queue.Queue<KeyEvent>
  private mouseQueue: Queue.Queue<MouseEvent>
  private running = false

  constructor(
    keyQueue: Queue.Queue<KeyEvent>,
    mouseQueue: Queue.Queue<MouseEvent>
  ) {
    this.keyQueue = keyQueue
    this.mouseQueue = mouseQueue
  }

  /**
   * Simulate a key press
   */
  pressKey(key: string | KeyEvent): Promise<void> {
    const keyEvent: KeyEvent = typeof key === 'string' 
      ? this.createKeyEvent(key)
      : key

    return Effect.runPromise(Queue.offer(this.keyQueue, keyEvent))
  }

  /**
   * Simulate multiple key presses with delays
   */
  async pressKeys(keys: (string | KeyEvent)[], delayMs = 100): Promise<void> {
    for (const key of keys) {
      await this.pressKey(key)
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  /**
   * Type a string (converts to individual key events)
   */
  async type(text: string, delayMs = 50): Promise<void> {
    const keys = text.split('').map(char => this.createKeyEvent(char))
    await this.pressKeys(keys, delayMs)
  }

  /**
   * Simulate special keys
   */
  async pressSpecialKey(key: 'enter' | 'escape' | 'up' | 'down' | 'left' | 'right' | 'tab' | 'space'): Promise<void> {
    await this.pressKey(this.createSpecialKeyEvent(key))
  }

  /**
   * Simulate Ctrl+key combination
   */
  async pressCtrl(key: string): Promise<void> {
    await this.pressKey({
      type: key === 'c' ? KeyType.CtrlC : KeyType.Runes,
      key: `ctrl+${key}`,
      runes: undefined,
      ctrl: true,
      alt: false,
      shift: false,
      meta: false
    })
  }

  /**
   * Create a basic key event from a string
   */
  private createKeyEvent(key: string): KeyEvent {
    return {
      type: KeyType.Runes,
      key: key,
      runes: key,
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    }
  }

  /**
   * Create special key events
   */
  private createSpecialKeyEvent(key: string): KeyEvent {
    const specialKeys: Record<string, KeyType> = {
      enter: KeyType.Enter,
      escape: KeyType.Escape,
      up: KeyType.Up,
      down: KeyType.Down,
      left: KeyType.Left,
      right: KeyType.Right,
      tab: KeyType.Tab,
      space: KeyType.Space
    }

    return {
      type: specialKeys[key] || KeyType.Runes,
      key: key,
      runes: key === 'space' ? ' ' : undefined,
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    }
  }
}

/**
 * Create a test input service with programmatic control
 */
export const createTestInputService = (): Layer.Layer<InputService, never, never> => {
  return Layer.effect(
    InputService,
    Effect.gen(function* (_) {
      const keyQueue = yield* _(Queue.unbounded<KeyEvent>())
      const mouseQueue = yield* _(Queue.unbounded<MouseEvent>())
      
      // Create the adapter for external control
      const adapter = new TestInputAdapter(keyQueue, mouseQueue)
      
      // Store adapter globally for test access
      ;(globalThis as Record<string, unknown>).__testInputAdapter = adapter

      return {
        keyEvents: Stream.fromQueue(keyQueue),
        mouseEvents: Stream.fromQueue(mouseQueue),
        
        allEvents: Stream.merge(
          Stream.fromQueue(keyQueue).pipe(
            Stream.map(key => ({ _tag: 'key' as const, event: key }))
          ),
          Stream.fromQueue(mouseQueue).pipe(
            Stream.map(mouse => ({ _tag: 'mouse' as const, event: mouse }))
          )
        ),
        
        waitForKey: Queue.take(keyQueue),
        waitForMouse: Queue.take(mouseQueue),
        
        clearInputBuffer: Effect.gen(function* (_) {
          yield* _(Queue.takeAll(keyQueue))
          yield* _(Queue.takeAll(mouseQueue))
        }),
        
        filterKeys: (predicate) =>
          Stream.fromQueue(keyQueue).pipe(
            Stream.filter(predicate)
          ),
          
        mapKeys: (mapper) =>
          Stream.fromQueue(keyQueue).pipe(
            Stream.filterMap((key) => {
              const result = mapper(key)
              return result !== null ? Option.some(result) : Option.none()
            })
          ),
          
        debounceKeys: (ms) =>
          Stream.fromQueue(keyQueue).pipe(
            Stream.debounce(ms)
          ),
          
        parseAnsiSequence: (sequence) => Effect.succeed(null),
        rawInput: Stream.empty,
        setEcho: (enabled) => Effect.sync(() => {})
      }
    })
  )
}

/**
 * Get the global test input adapter (for use in tests)
 */
export const getTestInputAdapter = (): TestInputAdapter | null => {
  return (globalThis as Record<string, unknown>).__testInputAdapter as TestInputAdapter || null
}

/**
 * Helper to run a TUI app with test input
 */
export const runTestApp = async <Model, Msg>(
  component: Component<Model, Msg>,
  testScript: (adapter: TestInputAdapter) => Promise<void>,
  config?: Record<string, unknown>
): Promise<void> => {
  const { runApp } = await import("../core/runtime")
  const { TerminalServiceLive } = await import("../services/impl/terminal-impl")
  const { RendererServiceLive } = await import("../services/impl/renderer-impl")
  const { StorageServiceLive } = await import("../services/impl/storage-impl")
  const { Layer } = await import("effect")
  
  // Create test services with test input
  const TestServices = Layer.mergeAll([
    TerminalServiceLive,
    createTestInputService(),
    RendererServiceLive,
    StorageServiceLive
  ])
  
  // Start the app
  const appPromise = Effect.runPromise(
    runApp(component, config).pipe(
      Effect.provide(TestServices)
    )
  )
  
  // Wait a bit for app to start
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Get the adapter and run the test script
  const adapter = getTestInputAdapter()
  if (adapter) {
    await testScript(adapter)
  }
  
  // Let the app run a bit more
  await new Promise(resolve => setTimeout(resolve, 500))
}
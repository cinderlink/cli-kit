/**
 * Input Service Implementation V2 - Using BubbleTea-inspired key handling
 */

import { Effect, Layer, Stream, Queue, Chunk, Option } from "effect"
import { InputService } from "../input.ts"
import { InputError } from "@/core/errors.ts"
import { 
  KeyEvent, 
  KeyType, 
  ANSI_SEQUENCES, 
  parseChar, 
  getKeyName 
} from "@/core/keys.ts"
import type { MouseEvent } from "@/core/types.ts"

/**
 * Parse mouse events from ANSI sequences
 */
const parseMouseEvent = (sequence: string): MouseEvent | null => {
  // Basic X10 mouse protocol: ESC [ M <button+32> <x+32> <y+32>
  const match = sequence.match(/^\x1b\[M(.)(.)(.)/)
  if (!match) return null
  
  const info = match[1].charCodeAt(0) - 32
  const x = match[2].charCodeAt(0) - 32
  const y = match[3].charCodeAt(0) - 32
  
  // Decode button info
  const button = info & 0x03
  const shift = !!(info & 0x04)
  const alt = !!(info & 0x08)
  const ctrl = !!(info & 0x10)
  const motion = !!(info & 0x20)
  
  return {
    x,
    y,
    button: button === 0 ? 'left' : button === 1 ? 'middle' : 'right',
    action: motion ? 'move' : 'click',
    shift,
    alt,
    ctrl,
  }
}

/**
 * Parse a buffer of input into key events
 */
const parseBuffer = (
  buffer: string, 
  keyQueue: Queue.Queue<KeyEvent>,
  mouseQueue: Queue.Queue<MouseEvent>
): string => {
  while (buffer.length > 0) {
    // Check for mouse events first
    if (buffer.startsWith('\x1b[M') && buffer.length >= 6) {
      const mouseSeq = buffer.slice(0, 6)
      buffer = buffer.slice(6)
      
      const mouseEvent = parseMouseEvent(mouseSeq)
      if (mouseEvent) {
        Effect.runSync(Queue.offer(mouseQueue, mouseEvent))
      }
      continue
    }
    
    // Check for known ANSI sequences (longest first)
    let matched = false
    const sortedSequences = Array.from(ANSI_SEQUENCES.entries())
      .sort((a, b) => b[0].length - a[0].length)
    
    for (const [seq, partial] of sortedSequences) {
      if (buffer.startsWith(seq)) {
        const keyEvent: KeyEvent = {
          type: partial.type || KeyType.Runes,
          key: partial.key || '',
          runes: partial.type === KeyType.Runes ? seq : undefined,
          ctrl: partial.ctrl || false,
          alt: partial.alt || false,
          shift: partial.shift || false,
          meta: false,
          sequence: seq
        }
        Effect.runSync(Queue.offer(keyQueue, keyEvent))
        buffer = buffer.slice(seq.length)
        matched = true
        break
      }
    }
    
    if (matched) continue
    
    // Handle Alt+key sequences (ESC followed by a character)
    if (buffer.startsWith('\x1b') && buffer.length > 1 && buffer[1] !== '[') {
      const char = buffer[1]
      const baseKey = parseChar(char)
      const keyEvent: KeyEvent = {
        ...baseKey,
        alt: true,
        key: `alt+${baseKey.runes || baseKey.key}`,
        sequence: buffer.slice(0, 2)
      }
      Effect.runSync(Queue.offer(keyQueue, keyEvent))
      buffer = buffer.slice(2)
      continue
    }
    
    // Handle regular characters
    if (!buffer.startsWith('\x1b') || buffer.length === 1) {
      const char = buffer[0]
      const keyEvent = parseChar(char)
      Effect.runSync(Queue.offer(keyQueue, {
        ...keyEvent,
        sequence: char
      }))
      buffer = buffer.slice(1)
      continue
    }
    
    // Incomplete escape sequence - wait for more data
    if (buffer.startsWith('\x1b') && buffer.length < 6) {
      break
    }
    
    // Unknown sequence - skip the escape character and continue
    console.debug('Unknown ANSI sequence:', buffer.slice(0, Math.min(10, buffer.length)))
    buffer = buffer.slice(1)
  }
  
  return buffer
}

/**
 * Create the live Input service implementation
 */
export const InputServiceLive = Layer.scoped(
  InputService,
  Effect.gen(function* (_) {
    const stdin = process.stdin
    const keyQueue = yield* _(Queue.unbounded<KeyEvent>())
    const mouseQueue = yield* _(Queue.unbounded<MouseEvent>())
    
    // Start reading from stdin
    yield* _(Effect.acquireRelease(
      Effect.sync(() => {
        stdin.setEncoding('utf8')
        
        // Try to enable raw mode for proper key handling
        const hasTTY = stdin.isTTY && 'setRawMode' in stdin
        if (hasTTY) {
          stdin.setRawMode(true)
        }
        
        // Setup input handling
        let buffer = ''
        stdin.on('data', (chunk: string) => {
          buffer += chunk
          buffer = parseBuffer(buffer, keyQueue, mouseQueue)
        })
        
        // Handle process signals
        process.on('SIGINT', () => {
          // Send Ctrl+C event
          const ctrlC: KeyEvent = {
            type: KeyType.CtrlC,
            key: 'ctrl+c',
            ctrl: true,
            alt: false,
            shift: false,
            meta: false,
          }
          Effect.runSync(Queue.offer(keyQueue, ctrlC))
        })
      }),
      () => Effect.sync(() => {
        stdin.removeAllListeners('data')
        if (stdin.isTTY && 'setRawMode' in stdin) {
          stdin.setRawMode(false)
        }
        process.removeAllListeners('SIGINT')
      })
    ))
    
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
      
      mapKeys: <T>(mapper: (key: KeyEvent) => T | null) =>
        Stream.fromQueue(keyQueue).pipe(
          Stream.filterMap((key): Option.Option<T> => {
            const result = mapper(key)
            return result !== null ? Option.some(result) : Option.none()
          })
        ),
      
      debounceKeys: (ms) =>
        Stream.fromQueue(keyQueue).pipe(
          Stream.debounce(ms)
        ),
      
      parseAnsiSequence: (sequence) =>
        Effect.sync(() => {
          const partial = ANSI_SEQUENCES.get(sequence)
          if (!partial) return null
          
          return {
            type: partial.type || KeyType.Runes,
            key: partial.key || '',
            runes: partial.type === KeyType.Runes ? sequence : undefined,
            ctrl: partial.ctrl || false,
            alt: partial.alt || false,
            shift: partial.shift || false,
            meta: false,
            sequence
          }
        }),
      
      rawInput: Stream.async<string>((emit) => {
        stdin.on('data', (chunk: string) => {
          emit(Effect.succeed(Chunk.of(chunk)))
        })
      }),
      
      setEcho: (enabled) =>
        Effect.try({
          try: () => {
            if (stdin.isTTY && 'setRawMode' in stdin) {
              stdin.setRawMode(!enabled)
            }
          },
          catch: (error) => new InputError({
            device: 'keyboard',
            cause: error
          })
        })
    }
  })
)
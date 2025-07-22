/**
 * Input Service Implementation V2 - Using BubbleTea-inspired key handling
 */

import { Effect, Layer, Stream, Queue, Chunk, Option, PubSub } from "effect"
import { InputService } from "@core/services/input"
import { InputError } from "@core/types/errors"
import { 
  KeyType, 
  ANSI_SEQUENCES, 
  parseChar, 
  getKeyName 
} from "../../terminal/input/keys"
import type { KeyEvent, MouseEvent, WindowSize } from "@core/types"

/**
 * Platform abstraction for input operations
 */
interface PlatformInput {
  readonly stdin: {
    readonly isTTY: boolean
    setEncoding: (encoding: string) => void
    setRawMode?: (enabled: boolean) => void
    on: (event: string, listener: (data: unknown) => void) => void
    removeAllListeners: (event?: string) => void
    removeListener: (event: string, listener: (data: unknown) => void) => void
  }
  readonly stdout: {
    readonly columns?: number
    readonly rows?: number
    write: (data: string) => void
    on: (event: string, listener: () => void) => void
    removeListener: (event: string, listener: () => void) => void
  }
}

/**
 * Get platform-specific input interface
 */
const getPlatform = (): PlatformInput => ({
  stdin: process.stdin,
  stdout: process.stdout
})

/**
 * Parse mouse events from ANSI sequences
 */
const parseMouseEvent = (sequence: string): MouseEvent | null => {
  // SGR extended mode: ESC [ < btn ; x ; y ; M/m
  let match = sequence.match(/^\x1b\[<(\d+);(-?\d+);(-?\d+)([Mm])/)
  if (match) {
    const info = parseInt(match[1])
    const x = parseInt(match[2])
    const y = parseInt(match[3])
    const isPress = match[4] === 'M'
    
    const button = info & 0x03
    const shift = !!(info & 0x04)
    const alt = !!(info & 0x08)
    const ctrl = !!(info & 0x10)
    const isWheel = !!(info & 0x40)
    
    let buttonName: MouseEvent['button']
    let eventType: MouseEvent['type']
    
    if (isWheel) {
      buttonName = (info & 0x01) ? 'wheel-down' : 'wheel-up'
      eventType = 'wheel'
    } else {
      buttonName = button === 0 ? 'left' : button === 1 ? 'middle' : button === 2 ? 'right' : 'none'
      eventType = isPress ? 'press' : 'release'
    }
    
    return {
      type: eventType,
      button: buttonName,
      x,
      y,
      ctrl,
      alt,
      shift
    }
  }
  
  // Basic X10 mouse protocol: ESC [ M <button+32> <x+32> <y+32>
  match = sequence.match(/^\x1b\[M(.)(.)(.)/)
  if (match) {
    const info = match[1]?.charCodeAt(0) ?? 32 - 32
    const x = match[2]?.charCodeAt(0) ?? 32 - 32
    const y = match[3]?.charCodeAt(0) ?? 32 - 32
    
    const button = info & 0x03
    const shift = !!(info & 0x04)
    const alt = !!(info & 0x08)
    const ctrl = !!(info & 0x10)
    const motion = !!(info & 0x20)
    const release = !!(info & 0x03 === 3)
    
    let buttonName: MouseEvent['button']
    let eventType: MouseEvent['type']
    
    if (motion) {
      buttonName = 'none'
      eventType = 'motion'
    } else if (release) {
      buttonName = 'none' // X10 doesn't tell us which button was released
      eventType = 'release'
    } else {
      buttonName = button === 0 ? 'left' : button === 1 ? 'middle' : 'right'
      eventType = 'press'
    }
    
    return {
      type: eventType,
      button: buttonName,
      x,
      y,
      ctrl,
      alt,
      shift
    }
  }
  
  return null
}

/**
 * Parse a buffer of input into key events
 */
const parseBuffer = (
  buffer: string, 
  keyPubSub: PubSub.PubSub<KeyEvent>,
  mousePubSub: PubSub.PubSub<MouseEvent>
): string => {
  while (buffer.length > 0) {
    // Check for SGR mouse events first: ESC [ < btn ; x ; y ; M/m
    const sgrMatch = buffer.match(/^\x1b\[<(\d+);(\d+);(\d+)[Mm]/)
    if (sgrMatch) {
      const mouseSeq = sgrMatch[0]
      buffer = buffer.slice(mouseSeq.length)
      
      const mouseEvent = parseMouseEvent(mouseSeq)
      if (mouseEvent) {
        Effect.runSync(PubSub.publish(mousePubSub, mouseEvent))
      }
      continue
    }
    
    // Check for X10 mouse events: ESC [ M <3 bytes>
    if (buffer.startsWith('\x1b[M') && buffer.length >= 6) {
      const mouseSeq = buffer.slice(0, 6)
      buffer = buffer.slice(6)
      
      const mouseEvent = parseMouseEvent(mouseSeq)
      if (mouseEvent) {
        Effect.runSync(PubSub.publish(mousePubSub, mouseEvent))
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
        Effect.runSync(PubSub.publish(keyPubSub, keyEvent))
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
      Effect.runSync(PubSub.publish(keyPubSub, keyEvent))
      buffer = buffer.slice(2)
      continue
    }
    
    // Handle regular characters
    if (!buffer.startsWith('\x1b') || buffer.length === 1) {
      const char = buffer[0]
      const keyEvent = parseChar(char)
      Effect.runSync(PubSub.publish(keyPubSub, {
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
    const platform = getPlatform()
    const stdin = platform.stdin
    // Use PubSub to broadcast events to all consumers
    const keyPubSub = yield* _(PubSub.unbounded<KeyEvent>())
    const mousePubSub = yield* _(PubSub.unbounded<MouseEvent>())
    
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
          buffer = parseBuffer(buffer, keyPubSub, mousePubSub)
        })
      }),
      () => Effect.sync(() => {
        stdin.removeAllListeners('data')
        if (stdin.isTTY && 'setRawMode' in stdin) {
          stdin.setRawMode(false)
        }
      })
    ))
    
    return {
      keyEvents: Stream.fromPubSub(keyPubSub),
      
      mouseEvents: Stream.fromPubSub(mousePubSub),
      
      readKey: Stream.fromPubSub(keyPubSub).pipe(
        Stream.take(1), 
        Stream.runHead, 
        Effect.flatMap(opt => 
          Option.isSome(opt) 
            ? Effect.succeed(opt.value)
            : Effect.fail(new InputError({ operation: "readKey", cause: "No key event available" }))
        )
      ),
      
      readLine: Effect.fail(new InputError({ operation: "readLine", cause: "Not implemented" })),
      
      inputAvailable: Effect.succeed(false),
      
      flushInput: Effect.void,
      
      filterKeys: (predicate) =>
        Stream.fromPubSub(keyPubSub).pipe(
          Stream.filter(predicate)
        ),
      
      mapKeys: <T>(mapper: (key: KeyEvent) => T | null) =>
        Stream.fromPubSub(keyPubSub).pipe(
          Stream.filterMap((key): Option.Option<T> => {
            const result = mapper(key)
            return result !== null ? Option.some(result) : Option.none()
          })
        ),
      
      debounceKeys: (ms) =>
        Stream.fromPubSub(keyPubSub).pipe(
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
      
      rawInput: Stream.async<Uint8Array>((emit) => {
        stdin.on('data', (chunk: unknown) => {
          if (chunk instanceof Buffer) {
            emit(Effect.succeed(Chunk.of(new Uint8Array(chunk))))
          } else if (typeof chunk === 'string') {
            emit(Effect.succeed(Chunk.of(new TextEncoder().encode(chunk))))
          }
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
        }),
      
      // Mouse Control
      enableMouse: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1000h') // Enable X10 mouse tracking
          platform.stdout.write('\x1b[?1002h') // Enable button event tracking
          platform.stdout.write('\x1b[?1015h') // Enable urxvt extended mode
          platform.stdout.write('\x1b[?1006h') // Enable SGR extended mode
        },
        catch: (error) => new InputError({
          device: 'mouse',
          cause: error
        })
      }),
      
      disableMouse: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1000l') // Disable X10 mouse tracking
          platform.stdout.write('\x1b[?1002l') // Disable button event tracking
          platform.stdout.write('\x1b[?1015l') // Disable urxvt extended mode
          platform.stdout.write('\x1b[?1006l') // Disable SGR extended mode
        },
        catch: (error) => new InputError({
          device: 'mouse',
          cause: error
        })
      }),
      
      enableMouseMotion: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1003h') // Enable all mouse motion tracking
        },
        catch: (error) => new InputError({
          device: 'mouse',
          cause: error
        })
      }),
      
      disableMouseMotion: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1003l') // Disable all mouse motion tracking
        },
        catch: (error) => new InputError({
          device: 'mouse',
          cause: error
        })
      }),
      
      resizeEvents: Stream.async<WindowSize>((emit) => {
        const handleResize = () => {
          emit(Effect.succeed(Chunk.of({
            width: platform.stdout.columns || 80,
            height: platform.stdout.rows || 24
          })))
        }
        
        platform.stdout.on('resize', handleResize)
        return Effect.sync(() => {
          platform.stdout.removeListener('resize', handleResize)
        })
      }),
      
      pasteEvents: Stream.empty, // Not implemented yet
      
      enableBracketedPaste: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?2004h') // Enable bracketed paste mode
        },
        catch: (error) => new InputError({
          operation: 'enableBracketedPaste',
          cause: error
        })
      }),
      
      disableBracketedPaste: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?2004l') // Disable bracketed paste mode
        },
        catch: (error) => new InputError({
          operation: 'disableBracketedPaste',
          cause: error
        })
      }),
      
      enableFocusTracking: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1004h') // Enable focus tracking
        },
        catch: (error) => new InputError({
          operation: 'enableFocusTracking',
          cause: error
        })
      }),
      
      disableFocusTracking: Effect.try({
        try: () => {
          platform.stdout.write('\x1b[?1004l') // Disable focus tracking
        },
        catch: (error) => new InputError({
          operation: 'disableFocusTracking',
          cause: error
        })
      }),
      
      focusEvents: Stream.empty // Not implemented yet
    }
  })
)
/**
 * Stream Components for Tuix
 *
 * Powerful stream handling with Effect.ts integration for terminal UIs
 * Uses Svelte 5 runes for reactive state management
 */

import { Stream, Effect, Chunk, pipe, Schedule, Fiber } from 'effect'
import type { View } from '../../core/types'
import { text, vstack, hstack } from '../../core/view'
import { jsx } from '../../jsx/runtime'
import { style, type Style } from '../../core/terminal/ansi/styles'
import { $state, $effect, $derived } from '../../reactivity/runes'

// Stream component props
export interface StreamProps<A> {
  /** The Effect Stream to consume */
  stream: Stream.Stream<A, any, any>

  /** Transform each stream item to a View */
  children?: (item: A) => JSX.Element | string

  /** Optional transformer function */
  transform?: (item: A) => string | JSX.Element

  /** Maximum items to display (FIFO) */
  maxItems?: number

  /** Style for each item */
  itemStyle?: Style

  /** Separator between items */
  separator?: JSX.Element | string

  /** What to show while waiting for first item */
  placeholder?: JSX.Element | string

  /** What to show on error */
  onError?: (error: any) => JSX.Element | string

  /** Called when stream completes */
  onComplete?: () => void

  /** Auto-scroll to latest item */
  autoScroll?: boolean

  /** Buffer strategy */
  buffer?: 'none' | 'sliding' | 'dropping' | 'unbounded'
  bufferSize?: number
}

/**
 * Stream Component - Renders items from an Effect Stream
 * Uses Svelte 5 runes for reactive state
 */
export function StreamComponent<A>(props: StreamProps<A>): JSX.Element {
  // Reactive state using runes
  const items = $state<A[]>([])
  const error = $state<any>(null)
  const isComplete = $state(false)

  // Effect to handle stream subscription
  $effect(() => {
    let fiber: Fiber.RuntimeFiber<void, any> | null = null

    const runStream = pipe(
      props.stream,
      // Apply buffering strategy
      props.buffer === 'sliding' && props.bufferSize
        ? Stream.bufferSliding(props.bufferSize)
        : props.buffer === 'dropping' && props.bufferSize
          ? Stream.bufferDropping(props.bufferSize)
          : props.buffer === 'unbounded'
            ? Stream.buffer({ capacity: 'unbounded' })
            : (s: any) => s,
      Stream.runForEach((item: A) =>
        Effect.sync(() => {
          const newItems = [...items(), item]
          // Apply maxItems limit
          if (props.maxItems && newItems.length > props.maxItems) {
            items.$set(newItems.slice(-props.maxItems))
          } else {
            items.$set(newItems)
          }
        })
      ),
      Effect.catchAll(e =>
        Effect.sync(() => {
          error.$set(e)
          return undefined
        })
      ),
      Effect.ensuring(
        Effect.sync(() => {
          isComplete.$set(true)
          props.onComplete?.()
        })
      )
    )

    // Run the stream effect
    Effect.runPromise(
      Effect.forkDaemon(runStream).pipe(
        Effect.map(f => {
          fiber = f
        })
      )
    )

    // Cleanup function
    return () => {
      if (fiber) {
        Effect.runPromise(Fiber.interrupt(fiber))
      }
    }
  })

  // Handle error state
  if (error() && props.onError) {
    const errorView = props.onError(error())
    return typeof errorView === 'string' ? jsx('error', { children: errorView }) : errorView
  }

  // Handle empty state
  if (items().length === 0 && !isComplete() && props.placeholder) {
    return typeof props.placeholder === 'string'
      ? jsx('text', { children: props.placeholder })
      : props.placeholder
  }

  // Render items
  const renderedItems = items().map((item, index) => {
    const rendered = props.children
      ? props.children(item)
      : props.transform
        ? props.transform(item)
        : String(item)

    const element =
      typeof rendered === 'string'
        ? jsx('text', { children: rendered, style: props.itemStyle })
        : rendered

    if (props.separator && index < items().length - 1) {
      return jsx('vstack', {
        children: [
          element,
          typeof props.separator === 'string'
            ? jsx('text', { children: props.separator })
            : props.separator,
        ],
      })
    }

    return element
  })

  return jsx('vstack', { children: renderedItems })
}

/**
 * Pipe Component - Transform stream data through a pipeline
 */
export interface PipeProps<A, B> {
  /** Input stream */
  from: Stream.Stream<A, any, any>

  /** Transform function or Effect */
  through: (value: A) => B | Effect.Effect<B, any, any>

  /** Render the output */
  children: (stream: Stream.Stream<B, any, any>) => JSX.Element

  /** Error handling */
  onError?: (error: any) => void

  /** Concurrency for transformations */
  concurrency?: number
}

export function PipeComponent<A, B>(props: PipeProps<A, B>): JSX.Element {
  const transformedStream = pipe(
    props.from,
    props.concurrency
      ? Stream.mapEffect(
          (a: A) => {
            const result = props.through(a)
            return Effect.isEffect(result) ? result : Effect.succeed(result)
          },
          { concurrency: props.concurrency }
        )
      : Stream.map((a: A) => {
          const result = props.through(a)
          return Effect.isEffect(result) ? Effect.runSync(result as any) : result
        })
  )

  return props.children(transformedStream)
}

/**
 * Transform Component - Apply multiple transformations to a stream
 */
export interface TransformProps<T> {
  /** Input stream */
  stream: Stream.Stream<T, any, any>

  /** Array of transformations to apply */
  transforms: Array<{
    name?: string
    fn: (stream: Stream.Stream<T, any, any>) => Stream.Stream<any, any, any>
  }>

  /** Render the final transformed stream */
  children: (stream: Stream.Stream<any, any, any>) => JSX.Element

  /** Show transformation pipeline visualization */
  showPipeline?: boolean
}

export function TransformComponent<T>(props: TransformProps<T>): JSX.Element {
  const finalStream = props.transforms.reduce(
    (stream, transform) => transform.fn(stream),
    props.stream
  )

  if (props.showPipeline) {
    const pipeline = props.transforms
      .filter(t => t.name)
      .map(t => t.name)
      .join(' → ')

    return jsx('vstack', {
      children: [
        jsx('text', {
          children: `Pipeline: ${pipeline}`,
          color: 'gray',
          italic: true,
        }),
        props.children(finalStream),
      ],
    })
  }

  return props.children(finalStream)
}

/**
 * StreamBox Component - Stream in a styled box
 */
export interface StreamBoxProps<A> extends StreamProps<A> {
  /** Box title */
  title?: string

  /** Box border style */
  border?: 'single' | 'double' | 'rounded' | 'thick'

  /** Box padding */
  padding?: number

  /** Box dimensions */
  width?: number
  height?: number

  /** Box style */
  boxStyle?: Style
}

export function StreamBoxComponent<A>(props: StreamBoxProps<A>): JSX.Element {
  const { title, border, padding, width, height, boxStyle, ...streamProps } = props

  return jsx('panel', {
    title,
    border: border || 'single',
    padding,
    width,
    height,
    style: boxStyle,
    children: jsx(StreamComponent, streamProps),
  })
}

/**
 * Helper functions for creating common streams
 */

/** Create a stream from an array with delays */
export function fromArray<A>(items: A[], delay?: number): Stream.Stream<A, never, never> {
  return delay
    ? pipe(Stream.fromIterable(items), Stream.schedule(Schedule.spaced(delay)))
    : Stream.fromIterable(items)
}

/** Create a stream that polls a function */
export function poll<A>(
  fn: () => A | Promise<A>,
  interval: number
): Stream.Stream<A, never, never> {
  return Stream.repeatEffect(Effect.promise(() => Promise.resolve(fn()))).pipe(
    Stream.schedule(Schedule.spaced(interval))
  )
}

/** Create a stream from EventEmitter-like source */
export function fromEventEmitter<A>(
  emitter: any,
  eventName: string
): Stream.Stream<A, never, never> {
  return Stream.async<A>(emit => {
    const handler = (data: A) => {
      emit.single(data)
    }

    emitter.on(eventName, handler)

    return Effect.sync(() => {
      emitter.off(eventName, handler)
    })
  })
}

/** Create a timer stream */
export function timer(interval: number, maxTicks?: number): Stream.Stream<number, never, never> {
  const baseStream = Stream.iterate(0, n => n + 1).pipe(Stream.schedule(Schedule.spaced(interval)))

  return maxTicks ? Stream.take(baseStream, maxTicks) : baseStream
}

/** Create a stream of random values */
export function random(min = 0, max = 100, interval?: number): Stream.Stream<number, never, never> {
  const stream = Stream.repeatEffect(Effect.sync(() => Math.random() * (max - min) + min))

  return interval ? stream.pipe(Stream.schedule(Schedule.spaced(interval))) : stream
}

// Export JSX components for direct use
export const Stream = StreamComponent
export const Pipe = PipeComponent
export const Transform = TransformComponent
export const StreamBox = StreamBoxComponent

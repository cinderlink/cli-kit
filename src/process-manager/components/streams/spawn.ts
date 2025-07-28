/**
 * Spawn Component - Execute processes and stream their output
 *
 * Integrates with Process Manager and Stream components for powerful
 * process execution with real-time output streaming
 */

import { Stream, Effect, pipe, Queue, Schedule } from 'effect'
import type { Subprocess } from 'bun'
import { jsx } from '../../jsx/runtime'
import type { ProcessManager } from '../../process-manager/manager'

// Spawn component props
export interface SpawnProps {
  /** Command to execute */
  command: string | string[]

  /** Working directory */
  cwd?: string

  /** Environment variables */
  env?: Record<string, string>

  /** What to do with stdout */
  stdout?:
    | 'stream'
    | 'buffer'
    | 'ignore'
    | ((stream: Stream.Stream<string, never, never>) => JSX.Element)

  /** What to do with stderr */
  stderr?:
    | 'stream'
    | 'buffer'
    | 'ignore'
    | 'merge'
    | ((stream: Stream.Stream<string, never, never>) => JSX.Element)

  /** What to do with stdin */
  stdin?: string | Stream.Stream<string, never, never> | 'inherit'

  /** Shell to use (if string command) */
  shell?: boolean | string

  /** Render function for the output streams */
  children?: (props: {
    stdout: Stream.Stream<string, never, never>
    stderr: Stream.Stream<string, never, never>
    exitCode: Promise<number>
    process: Subprocess
  }) => JSX.Element

  /** Called when process exits */
  onExit?: (code: number) => void

  /** Called on error */
  onError?: (error: any) => JSX.Element | string

  /** Auto-restart on failure */
  autoRestart?: boolean
  restartDelay?: number
  maxRestarts?: number

  /** Process manager integration */
  managed?: boolean
  processName?: string
  processGroup?: string

  /** Stream processing options */
  lineBuffer?: boolean // Buffer by lines
  encoding?: 'utf8' | 'buffer'

  /** Styling */
  stdoutStyle?: any
  stderrStyle?: any
}

/**
 * Create a stream from a ReadableStream
 */
function streamFromReadable(
  readable: ReadableStream<Uint8Array>,
  lineBuffer = true
): Stream.Stream<string, never, never> {
  return Stream.async<string>(emit => {
    const reader = readable.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // Emit any remaining buffered content
            if (buffer.length > 0) {
              emit.single(buffer)
            }
            emit.end()
            break
          }

          if (value) {
            const text = decoder.decode(value, { stream: true })

            if (lineBuffer) {
              buffer += text
              const lines = buffer.split('\n')

              // Keep the last incomplete line in the buffer
              buffer = lines.pop() || ''

              // Emit complete lines
              for (const line of lines) {
                emit.single(line)
              }
            } else {
              emit.single(text)
            }
          }
        }
      } catch (error) {
        emit.fail(error)
      }
    }

    read()

    return Effect.sync(() => {
      reader.cancel()
    })
  })
}

/**
 * Spawn Component - Execute a process and stream its output
 */
export function SpawnComponent(props: SpawnProps): JSX.Element {
  // Prepare command
  const cmd = Array.isArray(props.command) ? props.command : [props.command]

  // Create the subprocess
  const proc = Bun.spawn(cmd, {
    cwd: props.cwd,
    env: { ...process.env, ...props.env },
    stdout: props.stdout === 'ignore' ? 'ignore' : 'pipe',
    stderr: props.stderr === 'ignore' ? 'ignore' : props.stderr === 'merge' ? 'inherit' : 'pipe',
    stdin: props.stdin === 'inherit' ? 'inherit' : 'pipe',
  })

  // Create streams from stdout and stderr
  const stdoutStream =
    props.stdout !== 'ignore' && proc.stdout
      ? streamFromReadable(proc.stdout, props.lineBuffer !== false)
      : Stream.empty

  const stderrStream =
    props.stderr !== 'ignore' && props.stderr !== 'merge' && proc.stderr
      ? streamFromReadable(proc.stderr, props.lineBuffer !== false)
      : Stream.empty

  // Handle stdin if it's a stream
  if (props.stdin && Stream.isStream(props.stdin) && proc.stdin) {
    const writer = proc.stdin.getWriter()
    const encoder = new TextEncoder()

    Effect.runPromise(
      pipe(
        props.stdin,
        Stream.runForEach((data: string) =>
          Effect.promise(async () => {
            await writer.write(encoder.encode(data))
          })
        ),
        Effect.ensuring(
          Effect.promise(async () => {
            await writer.close()
          })
        )
      )
    )
  } else if (typeof props.stdin === 'string' && proc.stdin) {
    // Write string to stdin
    const writer = proc.stdin.getWriter()
    const encoder = new TextEncoder()
    writer.write(encoder.encode(props.stdin)).then(() => writer.close())
  }

  // Handle process exit
  const exitCode = proc.exited
  exitCode.then(code => {
    props.onExit?.(code)

    // Handle auto-restart
    if (props.autoRestart && code !== 0) {
      // TODO: Implement restart logic with maxRestarts
    }
  })

  // Use custom render function if provided
  if (props.children) {
    return props.children({
      stdout: stdoutStream,
      stderr: stderrStream,
      exitCode,
      process: proc,
    })
  }

  // Default rendering based on stdout/stderr props
  const elements: JSX.Element[] = []

  if (typeof props.stdout === 'function') {
    elements.push(props.stdout(stdoutStream))
  } else if (props.stdout === 'stream') {
    elements.push(
      jsx('Stream', {
        stream: stdoutStream,
        itemStyle: props.stdoutStyle,
        transform: (line: string) => jsx('text', { children: line }),
      })
    )
  }

  if (typeof props.stderr === 'function') {
    elements.push(props.stderr(stderrStream))
  } else if (props.stderr === 'stream') {
    elements.push(
      jsx('Stream', {
        stream: stderrStream,
        itemStyle: props.stderrStyle || { foreground: 'red' },
        transform: (line: string) => jsx('error', { children: line }),
      })
    )
  }

  return jsx('vstack', { children: elements })
}

/**
 * ManagedSpawn Component - Spawn with Process Manager integration
 */
export interface ManagedSpawnProps extends SpawnProps {
  /** Process manager instance */
  processManager?: ProcessManager

  /** Process configuration */
  processConfig?: {
    autorestart?: boolean
    group?: string
    logPreset?: string
    healthCheck?: {
      pattern: string
      timeout: number
    }
  }
}

export function ManagedSpawnComponent(props: ManagedSpawnProps): JSX.Element {
  const { processManager, processConfig, ...spawnProps } = props

  if (processManager && props.processName) {
    // Add to process manager
    Effect.runPromise(
      Effect.promise(async () => {
        await processManager.add({
          name: props.processName,
          command: Array.isArray(props.command) ? props.command.join(' ') : props.command,
          autorestart: processConfig?.autorestart ?? props.autoRestart ?? false,
          group: processConfig?.group ?? props.processGroup,
          logPreset: processConfig?.logPreset,
          healthCheck: processConfig?.healthCheck,
          env: props.env,
          cwd: props.cwd,
        })

        await processManager.start(props.processName)
      })
    )

    // Get logs from process manager
    const logs = processManager.getLogs(props.processName)
    const logStream = Stream.fromIterable(logs)

    // TODO: Create live log stream from process manager

    return jsx('StreamBox', {
      title: `Process: ${props.processName}`,
      stream: logStream,
      border: 'rounded',
      transform: (log: any) =>
        jsx('hstack', {
          children: [
            jsx('text', {
              children: log.timestamp.toLocaleTimeString(),
              color: 'gray',
            }),
            jsx('text', {
              children: ` [${log.level}] `,
              color: log.level === 'error' ? 'red' : log.level === 'warn' ? 'yellow' : 'blue',
            }),
            jsx('text', { children: log.message }),
          ],
        }),
    })
  }

  // Fallback to regular spawn
  return jsx(SpawnComponent, spawnProps)
}

/**
 * CommandPipeline Component - Chain multiple commands with pipes
 */
export interface CommandPipelineProps {
  /** Commands to pipe together */
  commands: Array<{
    command: string | string[]
    env?: Record<string, string>
    transform?: (stream: Stream.Stream<string, never, never>) => Stream.Stream<string, never, never>
  }>

  /** Render the final output */
  children?: (output: Stream.Stream<string, never, never>) => JSX.Element

  /** Error handling */
  onError?: (error: any, commandIndex: number) => JSX.Element

  /** Show pipeline visualization */
  showPipeline?: boolean
}

export function CommandPipelineComponent(props: CommandPipelineProps): JSX.Element {
  // Create a pipeline of processes
  let currentStream: Stream.Stream<string, never, never> | null = null

  for (let i = 0; i < props.commands.length; i++) {
    const cmd = props.commands[i]

    if (i === 0) {
      // First command - no input
      const proc = Bun.spawn(Array.isArray(cmd.command) ? cmd.command : [cmd.command], {
        env: { ...process.env, ...cmd.env },
        stdout: 'pipe',
      })

      currentStream = streamFromReadable(proc.stdout!)
    } else if (currentStream) {
      // Pipe previous output to this command's stdin
      const inputQueue = Queue.unbounded<string>()

      // Feed the stream into the queue
      Effect.runPromise(
        pipe(
          currentStream,
          Stream.runForEach((data: string) => Queue.offer(inputQueue, data))
        )
      )

      // Create subprocess with piped input
      const proc = Bun.spawn(Array.isArray(cmd.command) ? cmd.command : [cmd.command], {
        env: { ...process.env, ...cmd.env },
        stdout: 'pipe',
        stdin: 'pipe',
      })

      // Write queue contents to stdin
      Effect.runPromise(
        pipe(
          Stream.fromQueue(inputQueue),
          Stream.runForEach((data: string) =>
            Effect.promise(async () => {
              const writer = proc.stdin!.getWriter()
              await writer.write(new TextEncoder().encode(data + '\n'))
            })
          )
        )
      )

      currentStream = streamFromReadable(proc.stdout!)
    }

    // Apply transformation if specified
    if (cmd.transform && currentStream) {
      currentStream = cmd.transform(currentStream)
    }
  }

  if (!currentStream) {
    return jsx('error', { children: 'No commands in pipeline' })
  }

  // Show pipeline visualization if requested
  if (props.showPipeline) {
    const pipelineViz = props.commands
      .map(cmd => (Array.isArray(cmd.command) ? cmd.command[0] : cmd.command))
      .join(' | ')

    return jsx('vstack', {
      children: [
        jsx('text', {
          children: `$ ${pipelineViz}`,
          color: 'gray',
          italic: true,
        }),
        props.children ? props.children(currentStream) : jsx('Stream', { stream: currentStream }),
      ],
    })
  }

  return props.children ? props.children(currentStream) : jsx('Stream', { stream: currentStream })
}

// Export components
export const Spawn = SpawnComponent
export const ManagedSpawn = ManagedSpawnComponent
export const CommandPipeline = CommandPipelineComponent

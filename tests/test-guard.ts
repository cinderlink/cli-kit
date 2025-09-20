import { Effect } from "effect"
import * as Duration from "effect/Duration"

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.TEST_GUARD_TIMEOUT_MS ?? "60000", 10)

export interface TestGuardOptions {
  readonly timeoutMs?: number
  readonly label?: string
}

const formatLabel = (label?: string) => (label ? ` (${label})` : "")

export const guardEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: TestGuardOptions = {}
): Effect.Effect<A, E | Error, R> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (timeoutMs <= 0) {
    return effect
  }

  return Effect.timeoutFail(
    effect,
    Duration.millis(timeoutMs),
    () => new Error(`Test guard timed out after ${timeoutMs}ms${formatLabel(options.label)}`)
  )
}

export const guardAsync = async <T>(
  thunk: () => Promise<T> | T,
  options: TestGuardOptions = {}
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (timeoutMs <= 0) {
    return Promise.resolve().then(thunk)
  }

  let timer: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      Promise.resolve().then(thunk),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Test guard timed out after ${timeoutMs}ms${formatLabel(options.label)}`))
        }, timeoutMs).unref()
      })
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

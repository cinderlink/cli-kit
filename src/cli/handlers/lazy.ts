import type { CommandHandler } from "../types"

export interface LazyHandlerMetadata {
  readonly displayName?: string
  readonly description?: string
}

export interface LazyHandler extends CommandHandler {
  readonly _lazy: true
  readonly _loader: () => Promise<{ default: CommandHandler }>
}

export function lazyHandler(
  loader: () => Promise<{ default: CommandHandler }>,
  metadata: LazyHandlerMetadata = {}
): LazyHandler {
  const execute = async (context: Parameters<CommandHandler>[0]) => {
    const module = await loader()
    return module.default(context)
  }

  const handler = Object.assign(execute, {
    _lazy: true as const,
    _loader: loader,
    ...metadata
  }) satisfies LazyHandler

  return handler
}

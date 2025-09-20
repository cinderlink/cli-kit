import type { CommandHandler } from "../types"

export interface ConfigLazyHandlerMetadata {
  readonly displayName?: string
  readonly description?: string
}

export interface ConfigLazyHandler extends CommandHandler {
  readonly _lazy: true
  readonly _loader: () => Promise<{ default: CommandHandler }>
}

export function createLazyHandler(
  loader: () => Promise<{ default: CommandHandler }>,
  metadata: ConfigLazyHandlerMetadata = {}
): ConfigLazyHandler {
  const execute = async (context: Parameters<CommandHandler>[0]) => {
    const module = await loader()
    return module.default(context)
  }

  const handler = Object.assign(execute, {
    _lazy: true as const,
    _loader: loader,
    ...metadata
  }) satisfies ConfigLazyHandler

  return handler
}

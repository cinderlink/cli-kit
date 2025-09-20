import { z } from "zod"
import type { CommandConfig, CommandOptionsSchema, CommandArgumentsSchema, CommandHandler } from "../types"
import { createLazyHandler } from "./lazy-handler"

type HandlerLike = CommandHandler | (() => Promise<{ default: CommandHandler }>)

type DefineCommandInput = {
  readonly description?: string
  readonly summary?: string
  readonly options?: CommandOptionsSchema
  readonly args?: CommandArgumentsSchema
  readonly examples?: readonly string[]
  readonly hidden?: boolean
  readonly handler: HandlerLike
}

export function defineCommand(input: DefineCommandInput): CommandConfig {
  const { handler, options, args, ...rest } = input
  const normalizedOptions = options ?? {}

  if (args) {
    validateArguments(args)
  }

  const finalHandler = wrapHandler(handler)

  return {
    ...rest,
    options: normalizedOptions,
    args,
    handler: finalHandler
  }
}

function wrapHandler(handler: HandlerLike): CommandHandler {
  if (typeof handler !== "function") {
    throw new Error("Command handler must be a function")
  }

  if (handler.length > 0) {
    return handler as CommandHandler
  }

  if (handler.constructor.name === "AsyncFunction") {
    return createLazyHandler(handler as () => Promise<{ default: CommandHandler }>)
  }

  return handler as CommandHandler
}

function validateArguments(args: CommandArgumentsSchema): void {
  if (args instanceof z.ZodObject) {
    return
  }

  if (args instanceof z.ZodTuple) {
    return
  }

  throw new Error("Command args must be a Zod object or tuple")
}

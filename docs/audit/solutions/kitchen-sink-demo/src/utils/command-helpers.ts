/**
 * Command Helper Utilities
 * 
 * These would be provided by @tuix/cli in the real framework.
 */

import { z } from 'zod'

interface CommandSchemaInput {
  args?: Record<string, z.ZodSchema>
  flags?: Record<string, z.ZodSchema>
  options?: Record<string, z.ZodSchema>
}

export function createCommandSchema({ 
  args = {}, 
  flags = {}, 
  options = {} 
}: CommandSchemaInput) {
  return {
    args: z.object(args),
    flags: z.object(flags),
    options: z.object(options),
    // Combined schema for Command component
    full: z.object({
      args: z.object(args),
      flags: z.object(flags),
      options: z.object(options)
    })
  }
}

// Helper to merge schemas (for extending commands)
export function extendCommandSchema(
  base: ReturnType<typeof createCommandSchema>,
  extensions: CommandSchemaInput
) {
  return createCommandSchema({
    args: { ...base.args.shape, ...extensions.args },
    flags: { ...base.flags.shape, ...extensions.flags },
    options: { ...base.options.shape, ...extensions.options }
  })
}

// Helper for simple commands that only need args
export function createSimpleSchema(args: Record<string, z.ZodSchema>) {
  return createCommandSchema({ args })
}
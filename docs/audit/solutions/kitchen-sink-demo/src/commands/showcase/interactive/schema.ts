/**
 * Interactive Showcase Command Schema
 * 
 * Defines the arguments, flags, and options for the interactive showcase command.
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const interactiveShowcaseSchema = createCommandSchema({
  args: {
    component: z.string()
      .optional()
      .describe('Specific interactive component to showcase')
  },
  flags: {
    vim: z.boolean()
      .default(false)
      .describe('Enable vim mode for text inputs'),
    multiline: z.boolean()
      .default(false)
      .describe('Use multiline text inputs'),
    validation: z.boolean()
      .default(true)
      .describe('Show validation examples'),
    debug: z.boolean()
      .default(false)
      .describe('Show debug information for interactions')
  },
  options: {
    theme: z.enum(['light', 'dark', 'contrast'])
      .default('dark')
      .describe('Color theme for showcase'),
    mode: z.enum(['demo', 'playground', 'test'])
      .default('demo')
      .describe('Showcase mode')
  }
})

export type InteractiveShowcaseArgs = z.infer<typeof interactiveShowcaseSchema.args>
export type InteractiveShowcaseFlags = z.infer<typeof interactiveShowcaseSchema.flags>
export type InteractiveShowcaseOptions = z.infer<typeof interactiveShowcaseSchema.options>
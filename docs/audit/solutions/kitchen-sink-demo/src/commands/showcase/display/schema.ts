/**
 * Display Showcase Command Schema
 * 
 * Defines the arguments, flags, and options for the display showcase command.
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const displayShowcaseSchema = createCommandSchema({
  args: {
    component: z.string()
      .optional()
      .describe('Specific component to showcase')
  },
  flags: {
    animated: z.boolean()
      .default(true)
      .describe('Show animated components'),
    interactive: z.boolean()
      .default(false)
      .describe('Allow interaction with display components'),
    theme: z.enum(['light', 'dark', 'contrast'])
      .default('dark')
      .describe('Color theme for showcase')
  },
  options: {
    speed: z.enum(['slow', 'normal', 'fast'])
      .default('normal')
      .describe('Animation speed for components')
  }
})

export type DisplayShowcaseArgs = z.infer<typeof displayShowcaseSchema.args>
export type DisplayShowcaseFlags = z.infer<typeof displayShowcaseSchema.flags>
export type DisplayShowcaseOptions = z.infer<typeof displayShowcaseSchema.options>
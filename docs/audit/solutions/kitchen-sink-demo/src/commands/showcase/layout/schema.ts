/**
 * Layout Showcase Command Schema
 * 
 * Defines the arguments, flags, and options for the layout showcase command.
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const layoutShowcaseSchema = createCommandSchema({
  args: {
    pattern: z.string()
      .optional()
      .describe('Specific layout pattern to showcase')
  },
  flags: {
    borders: z.boolean()
      .default(true)
      .describe('Show borders on layout containers'),
    labels: z.boolean()
      .default(true)
      .describe('Show labels for layout sections'),
    responsive: z.boolean()
      .default(false)
      .describe('Show responsive layout examples'),
    debug: z.boolean()
      .default(false)
      .describe('Show layout debug information')
  },
  options: {
    gap: z.enum(['none', 'small', 'medium', 'large'])
      .default('medium')
      .describe('Gap size between layout elements'),
    padding: z.enum(['none', 'small', 'medium', 'large'])
      .default('small')
      .describe('Padding inside layout containers')
  }
})

export type LayoutShowcaseArgs = z.infer<typeof layoutShowcaseSchema.args>
export type LayoutShowcaseFlags = z.infer<typeof layoutShowcaseSchema.flags>
export type LayoutShowcaseOptions = z.infer<typeof layoutShowcaseSchema.options>
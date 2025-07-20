/**
 * Styling Showcase Command Schema
 * 
 * Defines the arguments, flags, and options for the styling showcase command.
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const stylingShowcaseSchema = createCommandSchema({
  args: {
    category: z.string()
      .optional()
      .describe('Specific styling category to showcase')
  },
  flags: {
    animated: z.boolean()
      .default(true)
      .describe('Show animated style transitions'),
    gradients: z.boolean()
      .default(true)
      .describe('Show gradient examples'),
    shadows: z.boolean()
      .default(true)
      .describe('Show shadow effects'),
    interactive: z.boolean()
      .default(false)
      .describe('Allow interactive style changes')
  },
  options: {
    theme: z.enum(['light', 'dark', 'neon', 'pastel', 'monochrome'])
      .default('dark')
      .describe('Color theme for showcase'),
    complexity: z.enum(['basic', 'intermediate', 'advanced'])
      .default('intermediate')
      .describe('Complexity level of examples')
  }
})

export type StylingShowcaseArgs = z.infer<typeof stylingShowcaseSchema.args>
export type StylingShowcaseFlags = z.infer<typeof stylingShowcaseSchema.flags>
export type StylingShowcaseOptions = z.infer<typeof stylingShowcaseSchema.options>
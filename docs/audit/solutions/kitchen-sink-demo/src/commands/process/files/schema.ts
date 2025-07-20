/**
 * Process Files Command Schema
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const processFilesSchema = createCommandSchema({
  args: {
    files: z.array(z.string())
      .min(1)
      .describe('Files to process')
  },
  flags: {
    ignore: z.array(z.string())
      .default([])
      .describe('Patterns to ignore'),
    output: z.string()
      .optional()
      .describe('Output directory'),
    parallel: z.boolean()
      .default(false)
      .describe('Process files in parallel'),
    dryRun: z.boolean()
      .default(false)
      .describe('Show what would be processed without doing it')
  }
})
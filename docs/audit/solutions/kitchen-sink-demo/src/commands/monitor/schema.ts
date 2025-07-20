/**
 * Monitor Command Schema
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const monitorSchema = createCommandSchema({
  args: {
    resource: z.enum(['cpu', 'memory', 'disk', 'network', 'all'])
      .default('all')
      .describe('Resource to monitor')
  },
  flags: {
    interval: z.number().default(1000).describe('Update interval in ms'),
    format: z.enum(['table', 'graph', 'json']).default('table')
  }
})
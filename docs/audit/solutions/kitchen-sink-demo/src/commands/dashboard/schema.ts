/**
 * Dashboard Command Schema
 * 
 * Defines the arguments, flags, and options for the dashboard command.
 */

import { z } from 'zod'
import { createCommandSchema } from '@tuix/cli'

export const dashboardSchema = createCommandSchema({
  args: {
    // No positional arguments for dashboard
  },
  flags: {
    refresh: z.number().default(5000).describe('Refresh interval in ms'),
    compact: z.boolean().default(false).describe('Use compact display'),
    metrics: z.array(z.enum(['cpu', 'memory', 'disk', 'network']))
      .default(['cpu', 'memory'])
      .describe('Metrics to display')
  },
  options: {
    theme: z.enum(['dark', 'light', 'auto']).default('auto')
  }
})

export type DashboardArgs = z.infer<typeof dashboardSchema.args>
export type DashboardFlags = z.infer<typeof dashboardSchema.flags>
export type DashboardOptions = z.infer<typeof dashboardSchema.options>
/**
 * Dashboard Command Exports
 * 
 * Default export is the provider (most common use case).
 * Named exports allow for more control when needed.
 */

export { DashboardCommand as default } from './provider'
export { DashboardCommand } from './provider'
export { DashboardHandler } from './handler'
export { dashboardSchema } from './schema'
export type { DashboardArgs, DashboardFlags, DashboardOptions } from './schema'
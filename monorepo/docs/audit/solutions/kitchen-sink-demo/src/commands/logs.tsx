/**
 * Logging Commands
 * 
 * Demonstrates logging plugin integration
 */

import { Command, Flag } from '@tuix/jsx'
import { LogViewer } from '../components/LogViewer'

export function LogCommands() {
  return (
    <Command 
      name="logs" 
      description="View and manage logs"
      interactive={(ctx) => Boolean(ctx.flags.follow || ctx.flags.tail)}
    >
      <Flag name="follow" alias="f" description="Follow log output" />
      <Flag name="tail" alias="t" type="number" description="Show last N lines" />
      <Flag name="level" description="Filter by log level" choices={['debug', 'info', 'warn', 'error']} />
      <Flag name="search" alias="s" description="Search logs" />
      
      <Command handler={(ctx) => (
        <LogViewer 
          follow={ctx.flags.follow}
          tail={ctx.flags.tail}
          level={ctx.flags.level}
          search={ctx.flags.search}
        />
      )} />
    </Command>
  )
}
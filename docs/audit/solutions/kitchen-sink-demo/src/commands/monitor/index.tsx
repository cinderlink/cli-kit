/**
 * Monitor Command - Simple all-in-one export
 * 
 * For simpler commands, we can combine everything in index.
 */

import { Command } from '@tuix/cli'
import { monitorSchema } from './schema'
import { MonitorHandler } from './handler'

export function MonitorCommand(props) {
  return (
    <Command
      name="monitor"
      description="Monitor system resources in real-time"
      schema={monitorSchema}
      {...props}
    >
      {MonitorHandler}
    </Command>
  )
}

export default MonitorCommand
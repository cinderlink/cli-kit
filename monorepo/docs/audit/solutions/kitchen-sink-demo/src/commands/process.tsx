/**
 * Process Management Commands
 * 
 * Demonstrates command organization and process management plugin usage
 */

import { Command, Arg, Flag } from '@tuix/jsx'
import { ProcessList } from '../components/ProcessList'
import { ProcessStarter } from '../components/ProcessStarter'
import { ProcessMonitor } from '../components/ProcessMonitor'

export function ProcessCommands() {
  return (
    <Command 
      name="pm" 
      description="Process management"
    >
      <Command 
        name="list" 
        description="List all processes"
        handler={() => <ProcessList />}
      />
      
      <Command 
        name="start" 
        description="Start a new process"
        interactive={true}
      >
        <Arg name="command" required description="Command to run" />
        <Flag name="watch" alias="w" description="Auto-restart on exit" />
        <Flag name="env" description="Environment file" />
        
        <Command handler={(ctx) => (
          <ProcessStarter 
            command={ctx.args.command}
            watch={ctx.flags.watch}
            envFile={ctx.flags.env}
          />
        )} />
      </Command>
      
      <Command 
        name="monitor" 
        description="Monitor processes in real-time"
        interactive={true}
        handler={() => <ProcessMonitor />}
      />
    </Command>
  )
}
/**
 * Development Commands
 * 
 * Demonstrates streaming and real-time features
 */

import { Command, Arg } from '@tuix/jsx'
import { FileWatcher } from '../components/FileWatcher'
import { TestRunner } from '../components/TestRunner'
import { BuildMonitor } from '../components/BuildMonitor'

export function DevCommands() {
  return (
    <Command 
      name="dev" 
      description="Development tools"
    >
      <Command 
        name="watch" 
        description="Watch files and run commands"
        interactive={true}
      >
        <Arg name="pattern" description="File pattern to watch" default="**/*.{ts,tsx}" />
        <Arg name="command" description="Command to run on change" />
        
        <Command handler={(ctx) => (
          <FileWatcher 
            pattern={ctx.args.pattern}
            command={ctx.args.command}
          />
        )} />
      </Command>
      
      <Command 
        name="test" 
        description="Run tests with live results"
        interactive={true}
        handler={() => <TestRunner />}
      />
      
      <Command 
        name="build" 
        description="Build with streaming output"
        interactive={true}
        handler={() => <BuildMonitor />}
      />
    </Command>
  )
}
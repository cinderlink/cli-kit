import { JSXApp } from 'tuix/jsx'
import { CLI, Command, Arg, Option } from 'tuix/cli'
import { DashboardCommand } from './commands/dashboard'
import { FormCommand } from './commands/form'
import { VisualizationCommand } from './commands/visualization'
import { FileExplorerCommand } from './commands/explorer'
import { TerminalCommand } from './commands/terminal'
import { SettingsCommand } from './commands/settings'
import { ShowcaseCommand } from './commands/showcase'

export const app = new JSXApp()
  .command(
    <CLI
      command="exemplar"
      description="Feature-rich Tuix JSX example application"
      version="1.0.0"
    >
      <Command
        name="dashboard"
        description="Interactive dashboard with real-time updates"
        handler={DashboardCommand}
      >
        <Option
          name="refresh"
          alias="r"
          type="number"
          description="Refresh interval in seconds"
          defaultValue={5}
        />
        <Option
          name="theme"
          alias="t"
          type="string"
          description="Color theme (dark/light/matrix)"
          defaultValue="dark"
        />
      </Command>

      <Command
        name="form"
        description="Advanced form with validation and dynamic fields"
        handler={FormCommand}
      >
        <Option
          name="mode"
          alias="m"
          type="string"
          description="Form mode (create/edit)"
          defaultValue="create"
        />
      </Command>

      <Command
        name="visualize"
        description="Data visualization components showcase"
        handler={VisualizationCommand}
      >
        <Arg
          name="dataset"
          type="string"
          description="Dataset to visualize"
          required={false}
          defaultValue="sample"
        />
        <Option
          name="type"
          alias="t"
          type="string"
          description="Chart type (bar/line/scatter/pie)"
          defaultValue="bar"
        />
      </Command>

      <Command
        name="explorer"
        description="File system explorer with navigation"
        handler={FileExplorerCommand}
      >
        <Arg
          name="path"
          type="string"
          description="Starting directory path"
          required={false}
          defaultValue="."
        />
        <Option
          name="show-hidden"
          alias="a"
          type="boolean"
          description="Show hidden files"
          defaultValue={false}
        />
      </Command>

      <Command
        name="terminal"
        description="Interactive terminal emulator"
        handler={TerminalCommand}
      >
        <Option
          name="shell"
          alias="s"
          type="string"
          description="Shell to use"
          defaultValue="/bin/bash"
        />
        <Option
          name="history"
          alias="h"
          type="number"
          description="History buffer size"
          defaultValue={1000}
        />
      </Command>

      <Command
        name="settings"
        description="Application settings and preferences"
        handler={SettingsCommand}
      >
        <Option
          name="profile"
          alias="p"
          type="string"
          description="Settings profile to load"
          defaultValue="default"
        />
      </Command>

      <Command
        name="showcase"
        description="Component showcase with all UI elements"
        handler={ShowcaseCommand}
      >
        <Option
          name="interactive"
          alias="i"
          type="boolean"
          description="Enable interactive mode"
          defaultValue={true}
        />
      </Command>
    </CLI>
  )
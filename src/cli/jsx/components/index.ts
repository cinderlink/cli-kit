/**
 * CLI JSX Components
 * 
 * Main components for building CLI applications with JSX
 */

export { CLI, type CLIProps } from './CLI'
export { Plugin, type PluginProps } from './Plugin'
export { Command, type CommandProps } from './Command'
export { Arg, type ArgProps } from './Arg'
export { Flag, type FlagProps } from './Flag'
export { Option, type OptionProps } from './Option'
export { Help, type HelpProps } from './Help'
export { Example, type ExampleProps } from './Example'
export { Exit, type ExitProps } from './Exit'
export { LoadPlugin, type LoadPluginProps } from './LoadPlugin'
// Export CLI-specific scope components
export { CommandLineScope, type CommandLineScopeProps } from './CommandLineScope'
export { CommandLineHelp, type CommandLineHelpProps } from './CommandLineHelp'

// Re-export base scope components for convenience
export { Scope, ScopeContent, ScopeFallback } from '../../../scope/jsx/components'
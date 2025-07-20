/**
 * JSX Components for Declarative CLI Definition
 * 
 * These components are used in JSX to define CLI structure declaratively.
 * They are processed by the jsx runtime to build the command structure.
 */

import { jsx } from "./jsx-runtime"

// Plugin Components
export const Plugin = (props: any) => jsx('Plugin', props)
export const Command = (props: any) => jsx('Command', props)
export const Arg = (props: any) => jsx('Arg', props)
export const Flag = (props: any) => jsx('Flag', props)
export const Help = (props: any) => jsx('Help', props)
export const Example = (props: any) => jsx('Example', props)

// Plugin Registration Components
export const RegisterPlugin = (props: any) => jsx('RegisterPlugin', props)
export const EnablePlugin = (props: any) => jsx('EnablePlugin', props)
export const ConfigurePlugin = (props: any) => jsx('ConfigurePlugin', props)

// Stream Components
export const Stream = (props: any) => jsx('Stream', props)
export const Pipe = (props: any) => jsx('Pipe', props)
export const Transform = (props: any) => jsx('Transform', props)
export const StreamBox = (props: any) => jsx('StreamBox', props)

// Spawn Components
export const Spawn = (props: any) => jsx('Spawn', props)
export const ManagedSpawn = (props: any) => jsx('ManagedSpawn', props)
export const CommandPipeline = (props: any) => jsx('CommandPipeline', props)

// Control Components
export const Exit = (props: any) => jsx('Exit', props)
#!/usr/bin/env bun

/**
 * Simple JSX CLI Example
 * 
 * A minimal example showing the Svelte-like JSX CLI system
 */

import { jsx, App, Command, Arg, Option } from '../src/cli/components'
import { Effect } from 'effect'
import { Text } from '../src/components'
import { $state, $effect } from '../src/reactivity/runes'

// Simple counter state using runes
const counter = $state(0)

// Track how many times commands have been run
$effect(() => {
  console.log(`Counter updated: ${counter.value}`)
})

export default jsx(() => (
  <App name="simple" version="1.0.0" description="Simple CLI example">
    <Command name="hello" description="Say hello">
      <Arg name="name" description="Name to greet" />
      
      {({ args }) => Effect.succeed(
        <Text>Hello, {args.name || 'World'}!</Text>
      )}
    </Command>
    
    <Command name="count" description="Increment and show counter">
      <Option name="by" alias="b" type="number" default={1} />
      
      {({ options }) => Effect.gen(function* () {
        counter.value += options.by || 1
        return <Text>Counter is now: {counter.value}</Text>
      })}
    </Command>
    
    <Command name="reset" description="Reset the counter">
      {() => Effect.gen(function* () {
        counter.value = 0
        return <Text color="yellow">Counter reset to 0</Text>
      })}
    </Command>
  </App>
))

// Run with:
// bun examples/simple-jsx-cli.tsx hello Alice
// bun examples/simple-jsx-cli.tsx count
// bun examples/simple-jsx-cli.tsx count --by 5
// bun examples/simple-jsx-cli.tsx reset
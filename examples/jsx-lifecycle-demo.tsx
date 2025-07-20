#!/usr/bin/env bun

/**
 * JSX CLI with Proper Lifecycle Management
 * 
 * Demonstrates how Svelte-style lifecycle hooks solve parent-child timing issues
 */

import { jsx, withLifecycle, onMount, $state } from '../src/jsx-app'
// Import $effect from the re-exported location
import { $effect } from '../src/reactivity/runes'

/**
 * A Plugin component that uses lifecycle hooks
 * 
 * The lifecycle ensures:
 * 1. Plugin JSX element is created and registered
 * 2. Child Command elements are processed
 * 3. onMount runs AFTER all children are processed
 */
const LifecyclePlugin = withLifecycle(() => {
  console.log('[1. INIT] Plugin component initializing...')
  
  const state = $state({
    name: 'lifecycle-demo',
    commandCount: 0,
    mounted: false
  })
  
  // Pre-effect: Runs BEFORE render
  $effect.pre(() => {
    console.log('[2. PRE-EFFECT] About to render Plugin with', state().commandCount, 'commands')
  })
  
  // Post-effect: Runs AFTER render
  $effect(() => {
    console.log('[4. POST-EFFECT] Plugin rendered with', state().commandCount, 'commands')
    
    // Cleanup function
    return () => {
      console.log('[CLEANUP] Plugin effect cleanup')
    }
  })
  
  // Mount: Runs after FIRST render only
  onMount(() => {
    console.log('[5. MOUNT] Plugin mounted! All children processed')
    state.$update(s => ({ ...s, mounted: true }))
    
    // At this point:
    // - Plugin element has been processed
    // - All Command children have been processed
    // - Plugin is registered and ready
    
    return () => {
      console.log('[UNMOUNT] Plugin unmounting')
    }
  })
  
  console.log('[3. RENDER] Plugin rendering JSX...')
  
  return (
    <Plugin name={state().name} description="Plugin with lifecycle management">
      <HelloCommand />
      <GoodbyeCommand />
      <StatusCommand mounted={state().mounted} />
    </Plugin>
  )
})

/**
 * Command components that register after parent is ready
 */
const HelloCommand = withLifecycle(() => {
  console.log('  [CHILD] Hello command initializing...')
  
  onMount(() => {
    console.log('  [CHILD MOUNT] Hello command mounted')
  })
  
  return (
    <Command name="hello" description="Say hello">
      <text color="green">Hello from lifecycle-aware component!</text>
    </Command>
  )
})

const GoodbyeCommand = withLifecycle(() => {
  console.log('  [CHILD] Goodbye command initializing...')
  
  onMount(() => {
    console.log('  [CHILD MOUNT] Goodbye command mounted')
  })
  
  return (
    <Command name="goodbye" description="Say goodbye">
      <text color="blue">Goodbye from lifecycle-aware component!</text>
    </Command>
  )
})

const StatusCommand = withLifecycle((props: { mounted: boolean }) => {
  const count = $state(0)
  
  $effect(() => {
    if (props.mounted) {
      console.log('  [STATUS] Parent is mounted, incrementing counter')
      const interval = setInterval(() => {
        count.$update(c => c + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  })
  
  return (
    <Command name="status" description="Show lifecycle status" interactive>
      <vstack>
        <text color="cyan">Lifecycle Status:</text>
        <text>Parent mounted: {props.mounted ? 'Yes' : 'No'}</text>
        <text>Update count: {count()}</text>
      </vstack>
    </Command>
  )
})

/**
 * Main app demonstrating lifecycle order
 */
function LifecycleApp() {
  console.log('\n=== Starting Lifecycle Demo ===\n')
  
  return <LifecyclePlugin />
}

// Run the app
console.log('Expected lifecycle order:')
console.log('1. Component initialization (Plugin, then Commands)')
console.log('2. Pre-effects run (before render)')
console.log('3. JSX renders')
console.log('4. Post-effects run (after render)')
console.log('5. onMount callbacks (parent after children)')
console.log('\nActual order:')

jsx(LifecycleApp).catch(console.error)
#!/usr/bin/env bun

/**
 * ProcessManagerPlugin Integration Example
 * 
 * Shows the correct way to integrate ProcessManagerPlugin with proper CLI name context:
 * - myapp dev start
 * - myapp dev status  
 * - myapp dev stop
 */

import { jsx, ProcessManagerPlugin, Plugin, Command } from '../src/index'

// ✅ CORRECT: Top-level usage for "dev start", "dev stop", etc.
// The CLI name (e.g., "myapp") will be automatically detected and used in help text
const MyAppCLI = () => (
  <>
    {/* This creates "dev" commands with proper CLI context */}
    <ProcessManagerPlugin name="dev" />
    
    {/* Other commands can go here */}
    <Command name="build" handler={() => <text>Building project...</text>} />
  </>
)

// ✅ ALTERNATIVE: Scoped within a plugin
const ScopedApp = () => (
  <Plugin name="myapp">
    {/* This creates "myapp dev start", "myapp dev status", etc. */}
    <ProcessManagerPlugin name="dev" />
    <Command name="build" handler={() => <text>Building...</text>} />
  </Plugin>
)

// Run the CLI
jsx(MyAppCLI).catch(console.error)
#!/usr/bin/env bun
/** @jsxImportSource . */
/**
 * Test scope isolation with the refactored architecture
 */

import { render, CLI, Plugin, Command } from './src/jsx/app'

function TestApp() {
  return (
    <CLI name="test-cli" version="1.0.0" description="Test scope isolation">
      <Plugin name="auth" description="Authentication commands">
        <Command name="login" description="Login to the system" handler={async () => {
          return <text>Logged in from auth plugin!</text>
        }} />
        <Command name="logout" description="Logout from the system" handler={async () => {
          return <text>Logged out from auth plugin!</text>
        }} />
      </Plugin>
      
      <Plugin name="dev" description="Development commands">
        <Command name="build" description="Build the project" handler={async () => {
          return <text>Building from dev plugin!</text>
        }} />
        <Command name="test" description="Run tests" handler={async () => {
          return <text>Testing from dev plugin!</text>
        }} />
      </Plugin>
      
      <Plugin name="workers" description="Worker management">
        <Command name="start" description="Start workers" handler={async () => {
          return <text>Starting workers!</text>
        }} />
        <Command name="stop" description="Stop workers" handler={async () => {
          return <text>Stopping workers!</text>
        }} />
      </Plugin>
    </CLI>
  )
}

// Run the app
render(<TestApp />)
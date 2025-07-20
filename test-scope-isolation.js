#!/usr/bin/env bun
/**
 * Test scope isolation with the refactored architecture
 */

import { render, jsx } from './src/jsx/app.ts'

const CLI = 'CLI'
const Plugin = 'Plugin'  
const Command = 'Command'

function TestApp() {
  return jsx(CLI, {
    name: "test-cli",
    version: "1.0.0", 
    description: "Test scope isolation",
    children: [
      jsx(Plugin, {
        name: "auth",
        description: "Authentication commands",
        children: [
          jsx(Command, {
            name: "login",
            description: "Login to the system",
            handler: async () => {
              return jsx('text', { children: "Logged in from auth plugin!" })
            }
          }),
          jsx(Command, {
            name: "logout",
            description: "Logout from the system",
            handler: async () => {
              return jsx('text', { children: "Logged out from auth plugin!" })
            }
          })
        ]
      }),
      jsx(Plugin, {
        name: "dev",
        description: "Development commands",
        children: [
          jsx(Command, {
            name: "build",
            description: "Build the project",
            handler: async () => {
              return jsx('text', { children: "Building from dev plugin!" })
            }
          }),
          jsx(Command, {
            name: "test",
            description: "Run tests",
            handler: async () => {
              return jsx('text', { children: "Testing from dev plugin!" })
            }
          })
        ]
      }),
      jsx(Plugin, {
        name: "workers",
        description: "Worker management",
        children: [
          jsx(Command, {
            name: "start",
            description: "Start workers",
            handler: async () => {
              return jsx('text', { children: "Starting workers!" })
            }
          }),
          jsx(Command, {
            name: "stop",
            description: "Stop workers",
            handler: async () => {
              return jsx('text', { children: "Stopping workers!" })
            }
          })
        ]
      })
    ]
  })
}

// Run the app
render(TestApp())
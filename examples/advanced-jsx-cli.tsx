#!/usr/bin/env bun

/**
 * Advanced JSX CLI Demo
 * 
 * Demonstrates the full power of JSX CLI applications with:
 * - Complex command structures with args and flags
 * - Plugin system
 * - Nested subcommands
 * - State management
 * - Interactive prompts
 */

import { runJSXCLI, defineJSXCommand, createJSXPlugin } from "../src/jsx-app"
import { $state, $derived } from "../src/components/reactivity"
import * as fs from "fs/promises"
import * as path from "path"

// Global application state
const appState = $state({
  users: [] as Array<{ id: string; name: string; email: string; role: string }>,
  projects: [] as Array<{ id: string; name: string; status: string; assignee?: string }>,
  config: {
    theme: 'dark' as 'light' | 'dark',
    apiUrl: 'https://api.example.com',
    verbose: false
  }
})

// ==============================================================================
// User Management Plugin
// ==============================================================================

const userPlugin = createJSXPlugin({
  name: "user",
  description: "User management functionality",
  version: "1.0.0",
  
  commands: {
    list: defineJSXCommand({
      name: "list",
      description: "List all users",
      flags: {
        format: {
          description: "Output format",
          alias: "f",
          type: "string",
          choices: ["table", "json", "csv"],
          default: "table"
        },
        role: {
          description: "Filter by role",
          type: "string",
          choices: ["admin", "user", "guest"]
        }
      },
      handler: (ctx) => {
        let users = appState.users
        
        if (ctx.flags.role) {
          users = users.filter(user => user.role === ctx.flags.role)
        }
        
        if (ctx.flags.format === "json") {
          return (
            <vstack>
              <text color="blue" bold>Users (JSON format)</text>
              <text>{JSON.stringify(users, null, 2)}</text>
            </vstack>
          )
        }
        
        return (
          <vstack>
            <text color="blue" bold>👥 Users ({users.length} total)</text>
            {ctx.flags.role && <text color="gray">Filtered by role: {ctx.flags.role}</text>}
            <text></text>
            
            {users.length === 0 ? (
              <text color="yellow">No users found. Use 'user add' to create some!</text>
            ) : (
              <panel title="User List" border="rounded">
                <vstack>
                  {users.map(user => (
                    <hstack key={user.id}>
                      <text color="green">•</text>
                      <text bold>{user.name}</text>
                      <text color="gray">({user.email})</text>
                      <text color="cyan">[{user.role}]</text>
                    </hstack>
                  ))}
                </vstack>
              </panel>
            )}
          </vstack>
        )
      }
    }),
    
    add: defineJSXCommand({
      name: "add",
      description: "Add a new user",
      args: {
        name: {
          description: "User's full name",
          required: true
        },
        email: {
          description: "User's email address",
          required: true
        }
      },
      flags: {
        role: {
          description: "User role",
          alias: "r",
          type: "string",
          choices: ["admin", "user", "guest"],
          default: "user"
        },
        interactive: {
          description: "Interactive mode",
          alias: "i",
          type: "boolean"
        }
      },
      examples: [
        "user add 'John Doe' john@example.com --role admin",
        "user add --interactive"
      ],
      handler: async (ctx) => {
        let name = ctx.args.name
        let email = ctx.args.email
        let role = ctx.flags.role
        
        if (ctx.flags.interactive) {
          name = await ctx.prompt("Enter user's full name:")
          email = await ctx.prompt("Enter user's email:")
          role = await ctx.select("Select user role:", ["admin", "user", "guest"])
        }
        
        if (!name || !email) {
          return (
            <vstack>
              <error>Missing required information</error>
              <text>Name and email are required.</text>
              <text color="blue">Try: user add 'John Doe' john@example.com</text>
            </vstack>
          )
        }
        
        // Check for duplicate email
        if (appState.users.some(u => u.email === email)) {
          return (
            <vstack>
              <error>User already exists</error>
              <text>A user with email {email} already exists.</text>
            </vstack>
          )
        }
        
        const newUser = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          role
        }
        
        appState.users = [...appState.users, newUser]
        
        return (
          <vstack>
            <success>User created successfully!</success>
            <panel title="New User" border="rounded">
              <vstack>
                <text>ID: {newUser.id}</text>
                <text>Name: {newUser.name}</text>
                <text>Email: {newUser.email}</text>
                <text>Role: {newUser.role}</text>
              </vstack>
            </panel>
          </vstack>
        )
      }
    }),
    
    remove: defineJSXCommand({
      name: "remove",
      description: "Remove a user",
      args: {
        identifier: {
          description: "User ID or email",
          required: true
        }
      },
      flags: {
        force: {
          description: "Skip confirmation",
          alias: "f",
          type: "boolean"
        }
      },
      handler: async (ctx) => {
        const user = appState.users.find(u => 
          u.id === ctx.args.identifier || u.email === ctx.args.identifier
        )
        
        if (!user) {
          return (
            <vstack>
              <error>User not found</error>
              <text>No user found with identifier: {ctx.args.identifier}</text>
            </vstack>
          )
        }
        
        if (!ctx.flags.force) {
          const confirmed = await ctx.confirm(`Remove user ${user.name} (${user.email})?`)
          if (!confirmed) {
            return <text color="gray">Cancelled.</text>
          }
        }
        
        appState.users = appState.users.filter(u => u.id !== user.id)
        
        return (
          <vstack>
            <success>User removed</success>
            <text>Removed: {user.name} ({user.email})</text>
          </vstack>
        )
      }
    })
  },
  
  hooks: {
    onInit: () => {
      console.log("🔌 User management plugin loaded")
    }
  }
})

// ==============================================================================
// Project Management Plugin
// ==============================================================================

const projectPlugin = createJSXPlugin({
  name: "project",
  description: "Project management functionality",
  
  commands: {
    list: defineJSXCommand({
      name: "list",
      description: "List all projects",
      flags: {
        status: {
          description: "Filter by status",
          type: "string",
          choices: ["active", "completed", "paused"]
        }
      },
      handler: (ctx) => {
        let projects = appState.projects
        
        if (ctx.flags.status) {
          projects = projects.filter(p => p.status === ctx.flags.status)
        }
        
        return (
          <vstack>
            <text color="purple" bold>📁 Projects ({projects.length} total)</text>
            {ctx.flags.status && <text color="gray">Status: {ctx.flags.status}</text>}
            <text></text>
            
            {projects.length === 0 ? (
              <text color="yellow">No projects found. Use 'project create' to start one!</text>
            ) : (
              <panel title="Project List" border="rounded">
                <vstack>
                  {projects.map(project => (
                    <hstack key={project.id}>
                      <text color="blue">📁</text>
                      <text bold>{project.name}</text>
                      <text color={
                        project.status === 'active' ? 'green' :
                        project.status === 'completed' ? 'blue' : 'yellow'
                      }>
                        [{project.status}]
                      </text>
                      {project.assignee && <text color="gray">→ {project.assignee}</text>}
                    </hstack>
                  ))}
                </vstack>
              </panel>
            )}
          </vstack>
        )
      }
    }),
    
    create: defineJSXCommand({
      name: "create",
      description: "Create a new project",
      args: {
        name: {
          description: "Project name",
          required: true
        }
      },
      flags: {
        assignee: {
          description: "Assign to user (email)",
          alias: "a",
          type: "string"
        },
        status: {
          description: "Initial status",
          type: "string",
          choices: ["active", "paused"],
          default: "active"
        }
      },
      handler: (ctx) => {
        // Validate assignee if provided
        if (ctx.flags.assignee) {
          const user = appState.users.find(u => u.email === ctx.flags.assignee)
          if (!user) {
            return (
              <vstack>
                <error>User not found</error>
                <text>No user found with email: {ctx.flags.assignee}</text>
                <text color="blue">Use 'user list' to see available users.</text>
              </vstack>
            )
          }
        }
        
        const newProject = {
          id: Math.random().toString(36).substr(2, 9),
          name: ctx.args.name,
          status: ctx.flags.status,
          assignee: ctx.flags.assignee
        }
        
        appState.projects = [...appState.projects, newProject]
        
        return (
          <vstack>
            <success>Project created!</success>
            <panel title="New Project" border="rounded">
              <vstack>
                <text>ID: {newProject.id}</text>
                <text>Name: {newProject.name}</text>
                <text>Status: {newProject.status}</text>
                {newProject.assignee && <text>Assignee: {newProject.assignee}</text>}
              </vstack>
            </panel>
          </vstack>
        )
      }
    }),
    
    status: defineJSXCommand({
      name: "status",
      description: "Update project status",
      args: {
        project: {
          description: "Project ID or name",
          required: true
        },
        status: {
          description: "New status",
          required: true,
          type: "string",
          choices: ["active", "completed", "paused"]
        }
      },
      handler: (ctx) => {
        const project = appState.projects.find(p => 
          p.id === ctx.args.project || p.name === ctx.args.project
        )
        
        if (!project) {
          return (
            <vstack>
              <error>Project not found</error>
              <text>No project found with identifier: {ctx.args.project}</text>
            </vstack>
          )
        }
        
        const oldStatus = project.status
        project.status = ctx.args.status
        
        return (
          <vstack>
            <success>Project status updated</success>
            <text>{project.name}: {oldStatus} → {project.status}</text>
          </vstack>
        )
      }
    })
  },
  
  hooks: {
    onInit: () => {
      console.log("🔌 Project management plugin loaded")
    }
  }
})

// ==============================================================================
// Configuration Management
// ==============================================================================

const configCommands = {
  get: defineJSXCommand({
    name: "get",
    description: "Get configuration value",
    args: {
      key: {
        description: "Configuration key",
        required: false
      }
    },
    handler: (ctx) => {
      if (!ctx.args.key) {
        return (
          <panel title="Configuration" border="rounded">
            <vstack>
              <text>Theme: {appState.config.theme}</text>
              <text>API URL: {appState.config.apiUrl}</text>
              <text>Verbose: {appState.config.verbose ? 'true' : 'false'}</text>
            </vstack>
          </panel>
        )
      }
      
      const value = appState.config[ctx.args.key as keyof typeof appState.config]
      if (value === undefined) {
        return <error>Unknown configuration key: {ctx.args.key}</error>
      }
      
      return (
        <vstack>
          <text color="blue">{ctx.args.key}:</text>
          <text>{String(value)}</text>
        </vstack>
      )
    }
  }),
  
  set: defineJSXCommand({
    name: "set",
    description: "Set configuration value",
    args: {
      key: {
        description: "Configuration key",
        required: true,
        choices: ["theme", "apiUrl", "verbose"]
      },
      value: {
        description: "Configuration value",
        required: true
      }
    },
    handler: (ctx) => {
      const key = ctx.args.key as keyof typeof appState.config
      let value: any = ctx.args.value
      
      // Type conversion
      if (key === 'verbose') {
        value = value === 'true' || value === '1'
      } else if (key === 'theme' && !['light', 'dark'].includes(value)) {
        return <error>Theme must be 'light' or 'dark'</error>
      }
      
      const oldValue = appState.config[key]
      appState.config[key] = value
      
      return (
        <vstack>
          <success>Configuration updated</success>
          <text>{key}: {String(oldValue)} → {String(value)}</text>
        </vstack>
      )
    }
  })
}

// ==============================================================================
// Main Commands
// ==============================================================================

const mainCommands = {
  status: defineJSXCommand({
    name: "status",
    description: "Show application status",
    flags: {
      detailed: {
        description: "Show detailed information",
        alias: "d",
        type: "boolean"
      }
    },
    handler: (ctx) => {
      const userCount = appState.users.length
      const projectCount = appState.projects.length
      const activeProjects = appState.projects.filter(p => p.status === 'active').length
      
      return (
        <vstack>
          <text color="cyan" bold>📊 Application Status</text>
          <text></text>
          
          <panel title="Overview" border="rounded">
            <vstack>
              <hstack>
                <text color="blue">Users:</text>
                <text>{userCount}</text>
              </hstack>
              <hstack>
                <text color="purple">Projects:</text>
                <text>{projectCount} total, {activeProjects} active</text>
              </hstack>
              <hstack>
                <text color="green">Theme:</text>
                <text>{appState.config.theme}</text>
              </hstack>
            </vstack>
          </panel>
          
          {ctx.flags.detailed && (
            <vstack>
              <panel title="Recent Users" border="single">
                <vstack>
                  {appState.users.slice(-3).map(user => (
                    <text key={user.id}>• {user.name} ({user.role})</text>
                  ))}
                  {userCount === 0 && <text color="gray">No users yet</text>}
                </vstack>
              </panel>
              
              <panel title="Active Projects" border="single">
                <vstack>
                  {appState.projects
                    .filter(p => p.status === 'active')
                    .slice(0, 3)
                    .map(project => (
                      <text key={project.id}>📁 {project.name}</text>
                    ))}
                  {activeProjects === 0 && <text color="gray">No active projects</text>}
                </vstack>
              </panel>
            </vstack>
          )}
        </vstack>
      )
    }
  }),
  
  config: defineJSXCommand({
    name: "config",
    description: "Manage application configuration",
    subcommands: configCommands,
    handler: () => (
      <vstack>
        <text color="blue" bold>Configuration Management</text>
        <text>Use subcommands:</text>
        <text color="green">• config get [key]</text>
        <text color="green">• config set &lt;key&gt; &lt;value&gt;</text>
      </vstack>
    )
  })
}

// ==============================================================================
// CLI Application
// ==============================================================================

runJSXCLI({
  name: "myapp",
  version: "1.0.0",
  description: "Advanced JSX CLI application with plugins and complex commands",
  
  commands: mainCommands,
  
  plugins: [userPlugin, projectPlugin],
  
  onInit: async () => {
    console.log("🚀 MyApp starting up...")
    
    // Load some sample data
    if (appState.users.length === 0) {
      appState.users = [
        { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin" },
        { id: "2", name: "Bob User", email: "bob@example.com", role: "user" }
      ]
    }
    
    if (appState.projects.length === 0) {
      appState.projects = [
        { id: "1", name: "Website Redesign", status: "active", assignee: "alice@example.com" },
        { id: "2", name: "Mobile App", status: "paused", assignee: "bob@example.com" }
      ]
    }
  },
  
  onExit: () => {
    console.log("👋 MyApp shutting down...")
  }
}).catch(console.error)
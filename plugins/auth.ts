/**
 * Authentication Plugin Example
 * 
 * Adds authentication capabilities to CLI applications
 */

import { definePlugin, createPlugin } from "../src/cli/plugin"
import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
import * as crypto from "crypto"
import { InfoPanel, SuccessPanel, ErrorPanel, text, vstack } from "../src/components/builders/index"

// Auth configuration schema
const authConfigSchema = z.object({
  tokenFile: z.string().default("~/.cli-kit/auth.json"),
  apiUrl: z.string().optional(),
  timeout: z.number().default(30000),
  allowOffline: z.boolean().default(false)
})

type AuthConfig = z.infer<typeof authConfigSchema>

// User token schema
const tokenSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string(),
  userId: z.string(),
  username: z.string(),
  permissions: z.array(z.string()).default([])
})

type AuthToken = z.infer<typeof tokenSchema>

// Create the auth plugin
export default createPlugin("auth", "1.0.0", (api) => {
  let authConfig: AuthConfig = authConfigSchema.parse({})
  let currentToken: AuthToken | null = null
  
  // Add auth commands
  api.addCommand("login", {
    description: "Login to the service",
    args: {
      username: z.string().describe("Username or email")
    },
    options: {
      password: z.string().optional().describe("Password (will prompt if not provided)"),
      token: z.string().optional().describe("API token for token-based auth")
    },
    handler: async (args) => {
      try {
        // Simulate authentication (in real implementation, call API)
        const token: AuthToken = {
          token: crypto.randomBytes(32).toString('hex'),
          refreshToken: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          userId: crypto.randomBytes(16).toString('hex'),
          username: args.username,
          permissions: ["read", "write"]
        }
        
        // Save token
        await saveToken(token, authConfig.tokenFile)
        currentToken = token
        
        return SuccessPanel(
          vstack(
            text(`✓ Successfully logged in as ${args.username}`),
            text(""),
            text(`User ID: ${token.userId}`),
            text(`Permissions: ${token.permissions.join(", ")}`),
            text(`Token expires: ${new Date(token.expiresAt).toLocaleDateString()}`)
          ),
          "Login Successful"
        )
      } catch (error) {
        return ErrorPanel(
          vstack(
            text("✗ Login failed"),
            text(""),
            text(`Error: ${error}`)
          ),
          "Login Error"
        )
      }
    }
  })
  
  api.addCommand("logout", {
    description: "Logout from the service",
    handler: async () => {
      try {
        await deleteToken(authConfig.tokenFile)
        currentToken = null
        
        return SuccessPanel(
          text("✓ Successfully logged out"),
          "Logout Successful"
        )
      } catch (error) {
        return ErrorPanel(
          text(`✗ Logout failed: ${error}`),
          "Logout Error"
        )
      }
    }
  })
  
  api.addCommand("whoami", {
    description: "Show current user information",
    handler: async () => {
      const token = await loadToken(authConfig.tokenFile)
      
      if (!token) {
        return InfoPanel(
          text("Not logged in. Use 'login' command to authenticate."),
          "Authentication Status"
        )
      }
      
      const expired = new Date(token.expiresAt) < new Date()
      
      return InfoPanel(
        vstack(
          text(`Username: ${token.username}`),
          text(`User ID: ${token.userId}`),
          text(`Permissions: ${token.permissions.join(", ")}`),
          text(""),
          expired
            ? text("⚠️  Token expired - please login again")
            : text(`Token expires: ${new Date(token.expiresAt).toLocaleDateString()}`)
        ),
        "Current User"
      )
    }
  })
  
  // Add middleware to check auth on protected commands
  api.addHook("beforeCommand", async (command, args) => {
    // Skip auth check for auth commands themselves
    if (command[0] === "login" || command[0] === "logout" || command[0] === "whoami") {
      return
    }
    
    // Check if command requires auth (could be configured per command)
    const requiresAuth = args._requireAuth !== false
    
    if (requiresAuth) {
      const token = await loadToken(authConfig.tokenFile)
      
      if (!token) {
        throw new Error("Authentication required. Please login first.")
      }
      
      if (new Date(token.expiresAt) < new Date()) {
        throw new Error("Authentication token expired. Please login again.")
      }
      
      // Add user info to context
      args._user = {
        id: token.userId,
        username: token.username,
        permissions: token.permissions
      }
    }
  })
  
  // Provide auth service
  api.provideService("auth", {
    getToken: () => loadToken(authConfig.tokenFile),
    getCurrentUser: async () => {
      const token = await loadToken(authConfig.tokenFile)
      return token ? {
        id: token.userId,
        username: token.username,
        permissions: token.permissions
      } : null
    },
    hasPermission: async (permission: string) => {
      const token = await loadToken(authConfig.tokenFile)
      return token ? token.permissions.includes(permission) : false
    },
    isAuthenticated: async () => {
      const token = await loadToken(authConfig.tokenFile)
      return token && new Date(token.expiresAt) > new Date()
    }
  })
})

// Helper functions
async function saveToken(token: AuthToken, tokenFile: string): Promise<void> {
  const filePath = tokenFile.replace(/^~/, process.env.HOME || '')
  const dir = path.dirname(filePath)
  
  // Create directory if it doesn't exist
  await fs.mkdir(dir, { recursive: true })
  
  // Save token
  await fs.writeFile(filePath, JSON.stringify(token, null, 2), 'utf-8')
  
  // Set restrictive permissions (owner read/write only)
  await fs.chmod(filePath, 0o600)
}

async function loadToken(tokenFile: string): Promise<AuthToken | null> {
  try {
    const filePath = tokenFile.replace(/^~/, process.env.HOME || '')
    const content = await fs.readFile(filePath, 'utf-8')
    return tokenSchema.parse(JSON.parse(content))
  } catch {
    return null
  }
}

async function deleteToken(tokenFile: string): Promise<void> {
  try {
    const filePath = tokenFile.replace(/^~/, process.env.HOME || '')
    await fs.unlink(filePath)
  } catch {
    // Ignore if file doesn't exist
  }
}

// Alternative export for direct use
export const authPlugin = definePlugin({
  metadata: {
    name: "auth",
    version: "1.0.0",
    description: "Authentication plugin for CLI applications",
    author: "CLI-KIT",
    keywords: ["auth", "authentication", "login", "security"]
  },
  
  commands: {
    login: {
      description: "Login to the service",
      args: {
        username: z.string().describe("Username or email")
      },
      handler: async (args) => {
        // Implementation as above
        return text("Login functionality")
      }
    }
  },
  
  config: authConfigSchema,
  defaultConfig: {
    tokenFile: "~/.cli-kit/auth.json",
    timeout: 30000,
    allowOffline: false
  },
  
  install: async (context) => {
    console.log("Auth plugin installed")
  },
  
  uninstall: async (context) => {
    console.log("Auth plugin uninstalled")
    // Could clean up token files here
  }
})
/**
 * Configuration Plugin Example
 * 
 * Adds configuration file management to CLI applications
 */

import { createPlugin } from "../src/cli/plugin"
import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
// import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import { Panel, InfoPanel, SuccessPanel, ErrorPanel, text, vstack } from "../src/components/builders/index"

// Config file formats
type ConfigFormat = 'json' | 'yaml' | 'toml'

// Plugin configuration
const configPluginSchema = z.object({
  configPath: z.string().default("./.tuix.config.json"),
  globalConfigPath: z.string().default("~/.tuix/config.json"),
  format: z.enum(['json', 'yaml', 'toml']).default('json'),
  mergeStrategy: z.enum(['shallow', 'deep', 'replace']).default('deep')
})

type ConfigPluginConfig = z.infer<typeof configPluginSchema>

// Create the config plugin
export default createPlugin("config", "1.0.0", (api) => {
  let pluginConfig: ConfigPluginConfig = configPluginSchema.parse({})
  let cachedConfig: any = null
  
  // Add config commands
  api.addCommand("config", {
    description: "Manage configuration",
    commands: {
      show: {
        description: "Show current configuration",
        options: {
          global: z.boolean().default(false).describe("Show global config"),
          local: z.boolean().default(false).describe("Show local config"),
          merged: z.boolean().default(true).describe("Show merged config")
        },
        handler: async (args) => {
          try {
            let config: any = {}
            
            if (args.global) {
              config = await loadConfig(pluginConfig.globalConfigPath, pluginConfig.format)
            } else if (args.local) {
              config = await loadConfig(pluginConfig.configPath, pluginConfig.format)
            } else {
              config = await getMergedConfig(pluginConfig)
            }
            
            return Panel(
              vstack(
                text("Current Configuration:"),
                text(""),
                text(JSON.stringify(config, null, 2))
              ),
              { title: args.global ? "Global Config" : args.local ? "Local Config" : "Merged Config" }
            )
          } catch (error) {
            return ErrorPanel(
              text(`Failed to load config: ${error}`),
              "Config Error"
            )
          }
        }
      },
      
      get: {
        description: "Get a configuration value",
        args: {
          key: z.string().describe("Configuration key (dot notation supported)")
        },
        handler: async (args) => {
          try {
            const config = await getMergedConfig(pluginConfig)
            const value = getByPath(config, args.key)
            
            if (value === undefined) {
              return InfoPanel(
                text(`Key '${args.key}' not found in configuration`),
                "Config Value"
              )
            }
            
            return InfoPanel(
              vstack(
                text(`${args.key}:`),
                text(""),
                text(typeof value === 'object' 
                  ? JSON.stringify(value, null, 2)
                  : String(value))
              ),
              "Config Value"
            )
          } catch (error) {
            return ErrorPanel(
              text(`Failed to get config value: ${error}`),
              "Config Error"
            )
          }
        }
      },
      
      set: {
        description: "Set a configuration value",
        args: {
          key: z.string().describe("Configuration key (dot notation supported)"),
          value: z.string().describe("Value to set")
        },
        options: {
          global: z.boolean().default(false).describe("Set in global config"),
          type: z.enum(['string', 'number', 'boolean', 'json']).default('string').describe("Value type")
        },
        handler: async (args) => {
          try {
            const configPath = args.global ? pluginConfig.globalConfigPath : pluginConfig.configPath
            const config = await loadConfig(configPath, pluginConfig.format) || {}
            
            // Parse value based on type
            let parsedValue: any = args.value
            switch (args.type) {
              case 'number':
                parsedValue = Number(args.value)
                break
              case 'boolean':
                parsedValue = args.value === 'true'
                break
              case 'json':
                parsedValue = JSON.parse(args.value)
                break
            }
            
            // Set value
            setByPath(config, args.key, parsedValue)
            
            // Save config
            await saveConfig(config, configPath, pluginConfig.format)
            
            // Clear cache
            cachedConfig = null
            
            return SuccessPanel(
              vstack(
                text(`✓ Configuration updated`),
                text(""),
                text(`${args.key} = ${JSON.stringify(parsedValue)}`)
              ),
              "Config Updated"
            )
          } catch (error) {
            return ErrorPanel(
              text(`Failed to set config value: ${error}`),
              "Config Error"
            )
          }
        }
      },
      
      delete: {
        description: "Delete a configuration value",
        args: {
          key: z.string().describe("Configuration key to delete")
        },
        options: {
          global: z.boolean().default(false).describe("Delete from global config")
        },
        handler: async (args) => {
          try {
            const configPath = args.global ? pluginConfig.globalConfigPath : pluginConfig.configPath
            const config = await loadConfig(configPath, pluginConfig.format) || {}
            
            // Delete value
            const deleted = deleteByPath(config, args.key)
            
            if (!deleted) {
              return InfoPanel(
                text(`Key '${args.key}' not found in configuration`),
                "Config Delete"
              )
            }
            
            // Save config
            await saveConfig(config, configPath, pluginConfig.format)
            
            // Clear cache
            cachedConfig = null
            
            return SuccessPanel(
              text(`✓ Configuration key '${args.key}' deleted`),
              "Config Updated"
            )
          } catch (error) {
            return ErrorPanel(
              text(`Failed to delete config value: ${error}`),
              "Config Error"
            )
          }
        }
      },
      
      init: {
        description: "Initialize configuration file",
        options: {
          global: z.boolean().default(false).describe("Initialize global config"),
          format: z.enum(['json', 'yaml', 'toml']).optional().describe("Config format"),
          force: z.boolean().default(false).describe("Overwrite existing config")
        },
        handler: async (args) => {
          try {
            const configPath = args.global ? pluginConfig.globalConfigPath : pluginConfig.configPath
            const format = args.format || pluginConfig.format
            const expandedPath = configPath.replace(/^~/, process.env.HOME || '')
            
            // Check if already exists
            try {
              await fs.access(expandedPath)
              if (!args.force) {
                return InfoPanel(
                  text(`Configuration file already exists at ${configPath}. Use --force to overwrite.`),
                  "Config Init"
                )
              }
            } catch {
              // File doesn't exist, good to create
            }
            
            // Create directory if needed
            await fs.mkdir(path.dirname(expandedPath), { recursive: true })
            
            // Create default config
            const defaultConfig = {
              version: "1.0.0",
              settings: {},
              plugins: {}
            }
            
            await saveConfig(defaultConfig, configPath, format)
            
            return SuccessPanel(
              vstack(
                text(`✓ Configuration file created`),
                text(""),
                text(`Path: ${configPath}`),
                text(`Format: ${format}`)
              ),
              "Config Initialized"
            )
          } catch (error) {
            return ErrorPanel(
              text(`Failed to initialize config: ${error}`),
              "Config Error"
            )
          }
        }
      }
    }
  })
  
  // Add middleware to inject config into command context
  api.addHook("beforeCommand", async (command, args) => {
    // Load and inject config
    const config = await getMergedConfig(pluginConfig)
    args._config = config
  })
  
  // Provide config service
  api.provideService("config", {
    get: async (key?: string) => {
      const config = await getMergedConfig(pluginConfig)
      return key ? getByPath(config, key) : config
    },
    set: async (key: string, value: any) => {
      const config = await loadConfig(pluginConfig.configPath, pluginConfig.format) || {}
      setByPath(config, key, value)
      await saveConfig(config, pluginConfig.configPath, pluginConfig.format)
      cachedConfig = null
    },
    getGlobal: async (key?: string) => {
      const config = await loadConfig(pluginConfig.globalConfigPath, pluginConfig.format) || {}
      return key ? getByPath(config, key) : config
    },
    setGlobal: async (key: string, value: any) => {
      const config = await loadConfig(pluginConfig.globalConfigPath, pluginConfig.format) || {}
      setByPath(config, key, value)
      await saveConfig(config, pluginConfig.globalConfigPath, pluginConfig.format)
      cachedConfig = null
    }
  })
})

// Helper functions
async function loadConfig(configPath: string, format: ConfigFormat): Promise<any> {
  try {
    const expandedPath = configPath.replace(/^~/, process.env.HOME || '')
    const content = await fs.readFile(expandedPath, 'utf-8')
    
    switch (format) {
      case 'json':
        return JSON.parse(content)
      case 'yaml':
        // return parseYaml(content)
        throw new Error("YAML format not yet supported - install 'yaml' package")
      case 'toml':
        // For TOML, you'd need a TOML parser library
        throw new Error("TOML format not yet supported")
      default:
        throw new Error(`Unknown format: ${format}`)
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function saveConfig(config: any, configPath: string, format: ConfigFormat): Promise<void> {
  const expandedPath = configPath.replace(/^~/, process.env.HOME || '')
  let content: string
  
  switch (format) {
    case 'json':
      content = JSON.stringify(config, null, 2)
      break
    case 'yaml':
      // content = stringifyYaml(config)
      throw new Error("YAML format not yet supported - install 'yaml' package")
    case 'toml':
      throw new Error("TOML format not yet supported")
    default:
      throw new Error(`Unknown format: ${format}`)
  }
  
  await fs.mkdir(path.dirname(expandedPath), { recursive: true })
  await fs.writeFile(expandedPath, content, 'utf-8')
}

async function getMergedConfig(pluginConfig: ConfigPluginConfig): Promise<any> {
  if (cachedConfig) {
    return cachedConfig
  }
  
  const globalConfig = await loadConfig(pluginConfig.globalConfigPath, pluginConfig.format) || {}
  const localConfig = await loadConfig(pluginConfig.configPath, pluginConfig.format) || {}
  
  let merged: any
  
  switch (pluginConfig.mergeStrategy) {
    case 'shallow':
      merged = { ...globalConfig, ...localConfig }
      break
    case 'deep':
      merged = deepMerge(globalConfig, localConfig)
      break
    case 'replace':
      merged = localConfig
      break
  }
  
  cachedConfig = merged
  return merged
}

function getByPath(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  
  return current
}

function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

function deleteByPath(obj: any, path: string): boolean {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      return false
    }
    current = current[key]
  }
  
  const lastKey = keys[keys.length - 1]
  if (lastKey in current) {
    delete current[lastKey]
    return true
  }
  
  return false
}

function deepMerge(target: any, source: any): any {
  if (!source) return target
  if (!target) return source
  
  const merged = { ...target }
  
  for (const key in source) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
      merged[key] = deepMerge(merged[key], source[key])
    } else {
      merged[key] = source[key]
    }
  }
  
  return merged
}

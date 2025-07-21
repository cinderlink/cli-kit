/**
 * Configuration Utilities
 * 
 * Helper functions for configuration management
 */

import * as path from "path"
import { watch } from "fs"
import { ConfigValue, ConfigObject } from "./types"

/**
 * Get a value from an object by dot-separated path
 */
export function getValueByPath(obj: ConfigObject, path: string): ConfigValue | undefined {
  const parts = path.split(".")
  let current: any = obj
  
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  
  return current
}

/**
 * Set a value in an object by dot-separated path
 */
export function setValueByPath(obj: ConfigObject, path: string, value: ConfigValue): void {
  const parts = path.split(".")
  let current: any = obj
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {}
    }
    
    current = current[part]
  }
  
  current[parts[parts.length - 1]] = value
}

/**
 * Delete a value from an object by dot-separated path
 */
export function deleteValueByPath(obj: ConfigObject, path: string): boolean {
  const parts = path.split(".")
  let current: any = obj
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    
    if (current && typeof current === "object" && part in current) {
      current = current[part]
    } else {
      return false
    }
  }
  
  const lastPart = parts[parts.length - 1]
  if (current && typeof current === "object" && lastPart in current) {
    delete current[lastPart]
    return true
  }
  
  return false
}

/**
 * Deep merge two configuration objects
 */
export function mergeDeep(target: ConfigObject, source: ConfigObject): ConfigObject {
  const result = { ...target }
  
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue
    }
    
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeDeep(result[key] as ConfigObject, value as ConfigObject)
    } else {
      result[key] = value
    }
  }
  
  return result
}

/**
 * Watch a file for changes
 */
export async function watchFile(
  filePath: string,
  callback: () => void
): Promise<() => void> {
  try {
    // Use Bun's file watcher if available
    if (typeof Bun !== "undefined" && Bun.file) {
      // For now, use a polling approach with Bun
      let lastModified = (await Bun.file(filePath).lastModified) || 0
      
      const interval = setInterval(async () => {
        try {
          const currentModified = (await Bun.file(filePath).lastModified) || 0
          if (currentModified > lastModified) {
            lastModified = currentModified
            callback()
          }
        } catch {
          // File might have been deleted
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
    
    // Fallback to Node.js fs.watch
    const watcher = watch(filePath, (eventType) => {
      if (eventType === "change") {
        callback()
      }
    })
    
    return () => watcher.close()
  } catch (error) {
    // If watching fails, return a no-op cleanup function
    return () => {}
  }
}

/**
 * Expand environment variables in a string
 */
export function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, name) => {
    return process.env[name] || match
  })
}

/**
 * Parse a value from string to appropriate type
 */
export function parseValue(value: string): ConfigValue {
  // Boolean
  if (value === "true") return true
  if (value === "false") return false
  
  // Null
  if (value === "null") return null
  
  // Number
  if (!isNaN(Number(value)) && value !== "") {
    return Number(value)
  }
  
  // Array (JSON)
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value)
    } catch {
      // Not valid JSON, return as string
    }
  }
  
  // Object (JSON)
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value)
    } catch {
      // Not valid JSON, return as string
    }
  }
  
  // String
  return value
}

/**
 * Convert a value to environment variable format
 */
export function toEnvFormat(key: string, value: ConfigValue): string {
  const envKey = key.toUpperCase().replace(/\./g, "_")
  
  if (value === null) {
    return `${envKey}=`
  }
  
  if (typeof value === "boolean") {
    return `${envKey}=${value}`
  }
  
  if (typeof value === "number") {
    return `${envKey}=${value}`
  }
  
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return `${envKey}=${JSON.stringify(value)}`
  }
  
  // String - escape if needed
  const strValue = String(value)
  if (strValue.includes(" ") || strValue.includes("=")) {
    return `${envKey}="${strValue.replace(/"/g, '\\"')}"`
  }
  
  return `${envKey}=${strValue}`
}

/**
 * Find config file in directory hierarchy
 */
export async function findConfigFile(
  startDir: string,
  fileNames: string[]
): Promise<string | null> {
  let currentDir = path.resolve(startDir)
  const root = path.parse(currentDir).root
  
  while (currentDir !== root) {
    for (const fileName of fileNames) {
      const filePath = path.join(currentDir, fileName)
      
      try {
        const file = Bun.file(filePath)
        if (await file.exists()) {
          return filePath
        }
      } catch {
        // Continue searching
      }
    }
    
    currentDir = path.dirname(currentDir)
  }
  
  return null
}

/**
 * Validate configuration against a schema
 */
export function validateConfig(
  config: ConfigObject,
  schema: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  const validate = (obj: any, schema: any, path = ""): void => {
    for (const [key, validator] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key
      const value = obj[key]
      
      if (typeof validator === "function") {
        try {
          if (!validator(value)) {
            errors.push(`Invalid value at ${fullPath}`)
          }
        } catch (error) {
          errors.push(`Validation error at ${fullPath}: ${error}`)
        }
      } else if (validator && typeof validator === "object") {
        if (value && typeof value === "object") {
          validate(value, validator, fullPath)
        } else {
          errors.push(`Expected object at ${fullPath}`)
        }
      }
    }
  }
  
  validate(config, schema)
  
  return {
    valid: errors.length === 0,
    errors
  }
}
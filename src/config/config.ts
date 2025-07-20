/**
 * Core Configuration Implementation
 * 
 * Handles configuration loading, merging, and inheritance
 */

import { Effect, Ref, Stream, Chunk } from "effect"
import { z } from "zod"
import * as path from "path"
import * as os from "os"
import type {
  Config,
  ConfigValue,
  ConfigObject,
  ConfigEntry,
  ConfigSource,
  ConfigOptions,
  ConfigSchema,
  ConfigChangeEvent,
  ConfigBuilder
} from "./types"
import { JSONLoader, TypeScriptLoader, YAMLLoader } from "./loaders"
import { getValueByPath, setValueByPath, deleteValueByPath, mergeDeep, watchFile } from "./utils"

/**
 * Configuration implementation
 */
export class TuixConfig implements Config {
  private data: Map<string, ConfigEntry> = new Map()
  private schema?: ConfigSchema
  private watchers: Set<(event: ConfigChangeEvent) => void> = new Set()
  private fileWatchers: Map<string, () => void> = new Map()
  private namespacePrefix: string = ""
  
  constructor(
    private options: ConfigOptions = {},
    namespacePrefix?: string
  ) {
    this.schema = options.schema
    this.namespacePrefix = namespacePrefix || ""
    
    // Set defaults
    if (options.defaults) {
      this.merge(options.defaults, "default")
    }
  }
  
  get<T = ConfigValue>(key: string): T | undefined {
    const fullKey = this.getFullKey(key)
    const entry = this.data.get(fullKey)
    return entry?.value as T | undefined
  }
  
  getOrDefault<T = ConfigValue>(key: string, defaultValue: T): T {
    return this.get<T>(key) ?? defaultValue
  }
  
  getWithSource<T = ConfigValue>(key: string): ConfigEntry<T> | undefined {
    const fullKey = this.getFullKey(key)
    return this.data.get(fullKey) as ConfigEntry<T> | undefined
  }
  
  set(key: string, value: ConfigValue, source: ConfigSource = "runtime"): void {
    const fullKey = this.getFullKey(key)
    const oldEntry = this.data.get(fullKey)
    
    const entry: ConfigEntry = {
      value,
      source,
      timestamp: new Date(),
      schema: this.getSchemaForKey(key)
    }
    
    // Validate if schema exists
    if (entry.schema) {
      const result = entry.schema.safeParse(value)
      if (!result.success) {
        throw new Error(`Validation failed for ${key}: ${result.error.message}`)
      }
    }
    
    this.data.set(fullKey, entry)
    
    // Notify watchers
    this.notifyWatchers({
      key: fullKey,
      oldValue: oldEntry?.value,
      newValue: value,
      source,
      timestamp: new Date()
    })
  }
  
  delete(key: string): void {
    const fullKey = this.getFullKey(key)
    const oldEntry = this.data.get(fullKey)
    
    if (oldEntry) {
      this.data.delete(fullKey)
      
      this.notifyWatchers({
        key: fullKey,
        oldValue: oldEntry.value,
        newValue: undefined as any,
        source: "runtime",
        timestamp: new Date()
      })
    }
  }
  
  has(key: string): boolean {
    const fullKey = this.getFullKey(key)
    return this.data.has(fullKey)
  }
  
  keys(): string[] {
    const keys: string[] = []
    for (const key of this.data.keys()) {
      if (this.namespacePrefix && key.startsWith(this.namespacePrefix)) {
        keys.push(key.slice(this.namespacePrefix.length + 1))
      } else if (!this.namespacePrefix) {
        keys.push(key)
      }
    }
    return keys
  }
  
  toObject(): ConfigObject {
    const obj: ConfigObject = {}
    
    for (const [key, entry] of this.data.entries()) {
      if (this.namespacePrefix && key.startsWith(this.namespacePrefix)) {
        const relativeKey = key.slice(this.namespacePrefix.length + 1)
        setValueByPath(obj, relativeKey, entry.value)
      } else if (!this.namespacePrefix) {
        setValueByPath(obj, key, entry.value)
      }
    }
    
    return obj
  }
  
  merge(config: ConfigObject, source: ConfigSource = "runtime"): void {
    const flatConfig = this.flattenObject(config)
    
    for (const [key, value] of Object.entries(flatConfig)) {
      this.set(key, value, source)
    }
  }
  
  validate(): { success: boolean; errors?: z.ZodError[] } {
    if (!this.schema) {
      return { success: true }
    }
    
    const errors: z.ZodError[] = []
    
    for (const [key, entry] of this.data.entries()) {
      if (entry.schema) {
        const result = entry.schema.safeParse(entry.value)
        if (!result.success) {
          errors.push(result.error)
        }
      }
    }
    
    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }
  
  watch(callback: (key: string, value: ConfigValue, source: ConfigSource) => void): () => void {
    const handler = (event: ConfigChangeEvent) => {
      callback(event.key, event.newValue, event.source)
    }
    
    this.watchers.add(handler)
    
    return () => {
      this.watchers.delete(handler)
    }
  }
  
  async loadFile(filePath: string): Promise<void> {
    const loader = this.getLoaderForFile(filePath)
    if (!loader) {
      throw new Error(`No loader found for file: ${filePath}`)
    }
    
    const config = await loader.load(filePath)
    this.merge(config, "project")
    
    // Watch file for changes if enabled
    if (this.options.watch) {
      const cleanup = await watchFile(filePath, async () => {
        const newConfig = await loader.load(filePath)
        this.merge(newConfig, "project")
      })
      
      this.fileWatchers.set(filePath, cleanup)
    }
  }
  
  async saveFile(filePath: string, keys?: string[]): Promise<void> {
    const loader = this.getLoaderForFile(filePath)
    if (!loader) {
      throw new Error(`No loader found for file: ${filePath}`)
    }
    
    let config = this.toObject()
    
    // Filter keys if specified
    if (keys && keys.length > 0) {
      const filtered: ConfigObject = {}
      for (const key of keys) {
        const value = getValueByPath(config, key)
        if (value !== undefined) {
          setValueByPath(filtered, key, value)
        }
      }
      config = filtered
    }
    
    await loader.save(filePath, config)
  }
  
  async reload(): Promise<void> {
    // Clear existing data
    this.data.clear()
    
    // Reload defaults
    if (this.options.defaults) {
      this.merge(this.options.defaults, "default")
    }
    
    // Load environment variables
    this.loadEnvironment()
    
    // Load user config
    if (this.options.loadUserConfig) {
      await this.loadUserConfig()
    }
    
    // Load project config
    if (this.options.loadProjectConfig) {
      await this.loadProjectConfig()
    }
    
    // Load specified files
    if (this.options.files) {
      for (const file of this.options.files) {
        try {
          await this.loadFile(file)
        } catch (error) {
          console.warn(`Failed to load config file ${file}:`, error)
        }
      }
    }
  }
  
  namespace(ns: string): Config {
    const prefix = this.namespacePrefix ? `${this.namespacePrefix}.${ns}` : ns
    return new TuixConfig(this.options, prefix)
  }
  
  // Private methods
  
  private getFullKey(key: string): string {
    return this.namespacePrefix ? `${this.namespacePrefix}.${key}` : key
  }
  
  private getSchemaForKey(key: string): z.ZodSchema<any> | undefined {
    if (!this.schema) return undefined
    
    const parts = key.split(".")
    let current: any = this.schema
    
    for (const part of parts) {
      if (current[part]) {
        current = current[part]
      } else {
        return undefined
      }
    }
    
    return current instanceof z.ZodSchema ? current : undefined
  }
  
  private flattenObject(obj: ConfigObject, prefix = ""): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as ConfigObject, fullKey))
      } else {
        result[fullKey] = value
      }
    }
    
    return result
  }
  
  private loadEnvironment(): void {
    const prefix = this.options.envPrefix || "TUIX_"
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key
          .slice(prefix.length)
          .toLowerCase()
          .replace(/_/g, ".")
        
        // Parse value
        let parsedValue: ConfigValue = value
        if (value === "true") parsedValue = true
        else if (value === "false") parsedValue = false
        else if (value && !isNaN(Number(value))) parsedValue = Number(value)
        
        this.set(configKey, parsedValue, "env")
      }
    }
  }
  
  private async loadUserConfig(): Promise<void> {
    const userConfigDir = path.join(os.homedir(), ".config", "tuix")
    const userConfigFiles = [
      path.join(userConfigDir, "settings.json"),
      path.join(userConfigDir, "config.json"),
      path.join(userConfigDir, "tuix.json")
    ]
    
    for (const file of userConfigFiles) {
      try {
        await this.loadFile(file)
        break // Load only the first found file
      } catch {
        // Continue to next file
      }
    }
  }
  
  private async loadProjectConfig(): Promise<void> {
    const searchPaths = this.options.searchPaths || [process.cwd()]
    const configFiles = [
      "tuix.config.ts",
      "tuix.config.js",
      "tuix.config.json",
      ".tuixrc.json",
      ".tuixrc"
    ]
    
    for (const searchPath of searchPaths) {
      for (const configFile of configFiles) {
        const filePath = path.join(searchPath, configFile)
        try {
          await this.loadFile(filePath)
          return // Load only the first found file
        } catch {
          // Continue to next file
        }
      }
    }
  }
  
  private getLoaderForFile(filePath: string) {
    const loaders = [
      new JSONLoader(),
      new TypeScriptLoader(),
      new YAMLLoader()
    ]
    
    return loaders.find(loader => loader.canLoad(filePath))
  }
  
  private notifyWatchers(event: ConfigChangeEvent): void {
    for (const watcher of this.watchers) {
      try {
        watcher(event)
      } catch (error) {
        console.error("Error in config watcher:", error)
      }
    }
  }
  
  /**
   * Clean up file watchers
   */
  dispose(): void {
    for (const cleanup of this.fileWatchers.values()) {
      cleanup()
    }
    this.fileWatchers.clear()
    this.watchers.clear()
  }
}

/**
 * Configuration builder implementation
 */
export class TuixConfigBuilder implements ConfigBuilder {
  private options: ConfigOptions = {}
  
  name(name: string): ConfigBuilder {
    this.options.name = name
    return this
  }
  
  file(path: string): ConfigBuilder {
    this.options.files = this.options.files || []
    this.options.files.push(path)
    return this
  }
  
  searchPath(path: string): ConfigBuilder {
    this.options.searchPaths = this.options.searchPaths || []
    this.options.searchPaths.push(path)
    return this
  }
  
  envPrefix(prefix: string): ConfigBuilder {
    this.options.envPrefix = prefix
    return this
  }
  
  schema(schema: ConfigSchema): ConfigBuilder {
    this.options.schema = schema
    return this
  }
  
  defaults(defaults: ConfigObject): ConfigBuilder {
    this.options.defaults = defaults
    return this
  }
  
  withUserConfig(): ConfigBuilder {
    this.options.loadUserConfig = true
    return this
  }
  
  withProjectConfig(): ConfigBuilder {
    this.options.loadProjectConfig = true
    return this
  }
  
  withWatch(): ConfigBuilder {
    this.options.watch = true
    return this
  }
  
  async build(): Promise<Config> {
    const config = new TuixConfig(this.options)
    await config.reload()
    return config
  }
}

/**
 * Create a new configuration builder
 */
export function createConfig(): ConfigBuilder {
  return new TuixConfigBuilder()
}
/**
 * Plugin Loader System
 * 
 * Handles dynamic loading of plugins from various sources
 */

import { Effect } from "effect"
import * as fs from "fs/promises"
import * as path from "path"
import type { Plugin } from "./plugin"
import { checkPluginCompatibility } from "./plugin"

export interface LoaderOptions {
  // Directories to search for plugins
  pluginDirs?: string[]
  // Package prefixes to auto-discover (e.g., "cli-kit-plugin-")
  packagePrefixes?: string[]
  // File patterns to match plugin files
  filePatterns?: string[]
  // Whether to load plugins from node_modules
  loadFromNodeModules?: boolean
  // CLI version for compatibility checking
  cliVersion?: string
  // Whether to fail on incompatible plugins
  strictCompatibility?: boolean
}

export interface LoadedPlugin {
  plugin: Plugin
  source: string
  loadTime: number
  error?: Error
}

export class PluginLoader {
  private options: Required<LoaderOptions>
  private loadedPlugins: Map<string, LoadedPlugin> = new Map()
  
  constructor(options: LoaderOptions = {}) {
    this.options = {
      pluginDirs: options.pluginDirs || [
        "./plugins",
        "~/.cli-kit/plugins",
        "/usr/local/lib/cli-kit/plugins"
      ],
      packagePrefixes: options.packagePrefixes || ["cli-kit-plugin-"],
      filePatterns: options.filePatterns || ["*.plugin.js", "*.plugin.ts"],
      loadFromNodeModules: options.loadFromNodeModules ?? true,
      cliVersion: options.cliVersion || "1.0.0",
      strictCompatibility: options.strictCompatibility ?? false
    }
  }
  
  /**
   * Load all plugins from configured sources
   */
  async loadAll(): Promise<LoadedPlugin[]> {
    const results: LoadedPlugin[] = []
    
    // Load from plugin directories
    for (const dir of this.options.pluginDirs) {
      const dirPlugins = await this.loadFromDirectory(dir)
      results.push(...dirPlugins)
    }
    
    // Load from node_modules
    if (this.options.loadFromNodeModules) {
      const nodePlugins = await this.loadFromNodeModules()
      results.push(...nodePlugins)
    }
    
    return results
  }
  
  /**
   * Load plugins from a directory
   */
  async loadFromDirectory(directory: string): Promise<LoadedPlugin[]> {
    const results: LoadedPlugin[] = []
    
    try {
      // Expand home directory
      const dir = directory.replace(/^~/, process.env.HOME || '')
      
      // Check if directory exists
      try {
        await fs.access(dir)
      } catch {
        // Directory doesn't exist, skip
        return results
      }
      
      // Read directory contents
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isFile() && this.matchesPattern(entry.name)) {
          const filePath = path.join(dir, entry.name)
          const loaded = await this.loadFromFile(filePath)
          
          if (loaded) {
            results.push(loaded)
          }
        } else if (entry.isDirectory()) {
          // Check if it's a plugin package
          const packagePath = path.join(dir, entry.name, 'package.json')
          
          try {
            await fs.access(packagePath)
            const loaded = await this.loadFromPackageDir(path.join(dir, entry.name))
            
            if (loaded) {
              results.push(loaded)
            }
          } catch {
            // Not a package, skip
          }
        }
      }
    } catch (error) {
      console.error(`Error loading plugins from ${directory}:`, error)
    }
    
    return results
  }
  
  /**
   * Load plugins from node_modules
   */
  async loadFromNodeModules(): Promise<LoadedPlugin[]> {
    const results: LoadedPlugin[] = []
    
    try {
      const nodeModulesPath = path.join(process.cwd(), 'node_modules')
      const entries = await fs.readdir(nodeModulesPath)
      
      for (const entry of entries) {
        // Check if matches package prefix
        const matchesPrefix = this.options.packagePrefixes.some(prefix => 
          entry.startsWith(prefix)
        )
        
        if (matchesPrefix) {
          const loaded = await this.loadFromPackageDir(
            path.join(nodeModulesPath, entry)
          )
          
          if (loaded) {
            results.push(loaded)
          }
        }
      }
    } catch (error) {
      console.error("Error loading plugins from node_modules:", error)
    }
    
    return results
  }
  
  /**
   * Load a plugin from a file
   */
  async loadFromFile(filePath: string): Promise<LoadedPlugin | null> {
    const startTime = Date.now()
    
    try {
      // Dynamic import
      const module = await import(filePath)
      const plugin = module.default || module.plugin
      
      if (!plugin) {
        throw new Error(`No default export or 'plugin' export found`)
      }
      
      // Check compatibility
      const compatibility = checkPluginCompatibility(plugin, this.options.cliVersion)
      
      if (!compatibility.compatible && this.options.strictCompatibility) {
        throw new Error(compatibility.reason)
      }
      
      const loaded: LoadedPlugin = {
        plugin,
        source: filePath,
        loadTime: Date.now() - startTime
      }
      
      // Cache the loaded plugin
      this.loadedPlugins.set(plugin.metadata.name, loaded)
      
      return loaded
    } catch (error) {
      console.error(`Failed to load plugin from ${filePath}:`, error)
      
      // Return null on error, as per function signature
      return null
    }
  }
  
  /**
   * Load a plugin from a package directory
   */
  async loadFromPackageDir(packageDir: string): Promise<LoadedPlugin | null> {
    try {
      const packageJsonPath = path.join(packageDir, 'package.json')
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
      
      // Determine entry point
      const entryPoint = packageJson.main || 'index.js'
      const pluginPath = path.join(packageDir, entryPoint)
      
      return await this.loadFromFile(pluginPath)
    } catch (error) {
      console.error(`Failed to load plugin from package ${packageDir}:`, error)
      return null
    }
  }
  
  /**
   * Load a specific plugin by name
   */
  async loadByName(name: string): Promise<LoadedPlugin | null> {
    // Check cache first
    if (this.loadedPlugins.has(name)) {
      return this.loadedPlugins.get(name)!
    }
    
    // Try to load from package
    try {
      const loaded = await this.loadFromFile(name)
      return loaded
    } catch {
      // Try with prefixes
      for (const prefix of this.options.packagePrefixes) {
        try {
          const loaded = await this.loadFromFile(prefix + name)
          if (loaded) return loaded
        } catch {
          // Continue trying
        }
      }
    }
    
    return null
  }
  
  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values())
  }
  
  /**
   * Get a loaded plugin by name
   */
  getPlugin(name: string): Plugin | null {
    return this.loadedPlugins.get(name)?.plugin || null
  }
  
  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<boolean> {
    const loaded = this.loadedPlugins.get(name)
    
    if (!loaded) {
      return false
    }
    
    // Call uninstall lifecycle if available
    if (loaded.plugin.uninstall) {
      try {
        await loaded.plugin.uninstall({
          command: [],
          config: {},
          plugins: [],
          metadata: loaded.plugin.metadata
        })
      } catch (error) {
        console.error(`Error uninstalling plugin ${name}:`, error)
      }
    }
    
    this.loadedPlugins.delete(name)
    return true
  }
  
  /**
   * Reload a plugin
   */
  async reloadPlugin(name: string): Promise<LoadedPlugin | null> {
    const existing = this.loadedPlugins.get(name)
    
    if (!existing) {
      return null
    }
    
    // Unload first
    await this.unloadPlugin(name)
    
    // Reload from source
    return await this.loadFromFile(existing.source)
  }
  
  /**
   * Check if file matches plugin patterns
   */
  private matchesPattern(filename: string): boolean {
    return this.options.filePatterns.some(pattern => {
      // Simple glob matching (in production, use a proper glob library)
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      
      return new RegExp(`^${regex}$`).test(filename)
    })
  }
}

/**
 * Create a plugin loader with Effect integration
 */
export const createPluginLoader = (options?: LoaderOptions) => 
  Effect.sync(() => new PluginLoader(options))

/**
 * Load all plugins as an Effect
 */
export const loadAllPlugins = (loader: PluginLoader) =>
  Effect.tryPromise({
    try: () => loader.loadAll(),
    catch: (error) => new Error(`Failed to load plugins: ${error}`)
  })

/**
 * Load plugin by name as an Effect
 */
export const loadPluginByName = (loader: PluginLoader, name: string) =>
  Effect.tryPromise({
    try: () => loader.loadByName(name),
    catch: (error) => new Error(`Failed to load plugin '${name}': ${error}`)
  })
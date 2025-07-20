/**
 * Plugin Command - Plugin Management
 * 
 * Provides plugin management functionality including installation, discovery,
 * marketplace integration, and development tools for TUIX plugins.
 */

import { defineCommand } from "../../../../src/cli/config.js"
import { z } from "zod"
import { spawn } from "child_process"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, resolve } from "path"
import { promisify } from "util"

const execAsync = promisify(require('child_process').exec)

interface PluginInfo {
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  keywords: string[]
  engines?: Record<string, string>
  tuixVersion?: string
  installed: boolean
  localPath?: string
}

interface PluginRegistry {
  plugins: Record<string, PluginInfo>
  lastUpdated: string
}

class PluginManager {
  private registryPath = join(process.cwd(), '.tuix', 'plugins.json')
  private registry: PluginRegistry = { plugins: {}, lastUpdated: new Date().toISOString() }
  
  constructor(private verbose: boolean = false) {
    this.loadRegistry()
  }
  
  /**
   * Load plugin registry from disk
   */
  private loadRegistry(): void {
    if (existsSync(this.registryPath)) {
      try {
        const content = readFileSync(this.registryPath, 'utf8')
        this.registry = JSON.parse(content)
      } catch (error) {
        if (this.verbose) {
          console.warn(`⚠️  Failed to load plugin registry:`, error)
        }
      }
    }
  }
  
  /**
   * Save plugin registry to disk
   */
  private saveRegistry(): void {
    mkdirSync(join(this.registryPath, '..'), { recursive: true })
    this.registry.lastUpdated = new Date().toISOString()
    writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2))
  }
  
  /**
   * Install a plugin
   */
  async install(pluginName: string, version?: string): Promise<void> {
    const packageSpec = version ? `${pluginName}@${version}` : pluginName
    
    console.log(`📦 Installing plugin: ${packageSpec}`)
    
    try {
      // Install with bun
      await this.runCommand(['bun', 'add', packageSpec])
      
      // Verify installation
      const pluginInfo = await this.getPluginInfo(pluginName)
      if (pluginInfo) {
        this.registry.plugins[pluginName] = pluginInfo
        this.saveRegistry()
        
        console.log(`✅ Plugin '${pluginName}' installed successfully`)
        
        if (this.verbose) {
          console.log(`   Version: ${pluginInfo.version}`)
          console.log(`   Description: ${pluginInfo.description}`)
        }
      } else {
        throw new Error(`Plugin '${pluginName}' was installed but could not be verified`)
      }
      
    } catch (error) {
      throw new Error(`Failed to install plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * Uninstall a plugin
   */
  async uninstall(pluginName: string): Promise<void> {
    console.log(`🗑️  Uninstalling plugin: ${pluginName}`)
    
    try {
      // Remove with bun
      await this.runCommand(['bun', 'remove', pluginName])
      
      // Remove from registry
      delete this.registry.plugins[pluginName]
      this.saveRegistry()
      
      console.log(`✅ Plugin '${pluginName}' uninstalled successfully`)
      
    } catch (error) {
      throw new Error(`Failed to uninstall plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * List installed plugins
   */
  async list(): Promise<PluginInfo[]> {
    console.log(`📋 Installed TUIX plugins:`)
    
    const plugins = Object.values(this.registry.plugins)
    
    if (plugins.length === 0) {
      console.log(`   No plugins installed`)
      return []
    }
    
    // Verify each plugin is still installed
    const verifiedPlugins: PluginInfo[] = []
    
    for (const plugin of plugins) {
      const info = await this.getPluginInfo(plugin.name)
      if (info) {
        verifiedPlugins.push(info)
        console.log(`   • ${info.name}@${info.version} - ${info.description}`)
      } else {
        // Plugin was removed manually, clean up registry
        delete this.registry.plugins[plugin.name]
      }
    }
    
    if (verifiedPlugins.length !== plugins.length) {
      this.saveRegistry()
    }
    
    return verifiedPlugins
  }
  
  /**
   * Search for plugins in the marketplace
   */
  async search(query: string): Promise<PluginInfo[]> {
    console.log(`🔍 Searching for plugins: "${query}"`)
    
    try {
      // Search npm registry for tuix plugins
      const searchResult = await execAsync(`npm search @tuix/plugin ${query} --json`)
      const results = JSON.parse(searchResult.stdout)
      
      const plugins: PluginInfo[] = results.map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || '',
        author: pkg.publisher?.username || 'Unknown',
        homepage: pkg.links?.homepage,
        keywords: pkg.keywords || [],
        tuixVersion: pkg.engines?.tuix,
        installed: this.registry.plugins[pkg.name] !== undefined
      }))
      
      if (plugins.length === 0) {
        console.log(`   No plugins found matching "${query}"`)
      } else {
        console.log(`   Found ${plugins.length} plugin(s):`)
        plugins.forEach(plugin => {
          const installedMark = plugin.installed ? ' ✅' : ''
          console.log(`   • ${plugin.name}@${plugin.version}${installedMark}`)
          console.log(`     ${plugin.description}`)
        })
      }
      
      return plugins
      
    } catch (error) {
      console.warn(`⚠️  Search failed:`, error)
      return []
    }
  }
  
  /**
   * Show plugin information
   */
  async info(pluginName: string): Promise<void> {
    const info = await this.getPluginInfo(pluginName)
    
    if (!info) {
      console.log(`❌ Plugin '${pluginName}' not found`)
      return
    }
    
    console.log(`📊 Plugin Information: ${info.name}`)
    console.log(`   Version: ${info.version}`)
    console.log(`   Description: ${info.description}`)
    console.log(`   Author: ${info.author}`)
    console.log(`   Installed: ${info.installed ? 'Yes' : 'No'}`)
    
    if (info.homepage) {
      console.log(`   Homepage: ${info.homepage}`)
    }
    
    if (info.keywords.length > 0) {
      console.log(`   Keywords: ${info.keywords.join(', ')}`)
    }
    
    if (info.tuixVersion) {
      console.log(`   TUIX Version: ${info.tuixVersion}`)
    }
    
    if (info.localPath) {
      console.log(`   Local Path: ${info.localPath}`)
    }
  }
  
  /**
   * Update all plugins
   */
  async update(): Promise<void> {
    console.log(`🔄 Updating all plugins...`)
    
    const plugins = Object.keys(this.registry.plugins)
    
    if (plugins.length === 0) {
      console.log(`   No plugins to update`)
      return
    }
    
    for (const pluginName of plugins) {
      try {
        console.log(`   Updating ${pluginName}...`)
        await this.runCommand(['bun', 'update', pluginName])
        
        // Update registry info
        const info = await this.getPluginInfo(pluginName)
        if (info) {
          this.registry.plugins[pluginName] = info
        }
        
      } catch (error) {
        console.warn(`   ⚠️  Failed to update ${pluginName}:`, error)
      }
    }
    
    this.saveRegistry()
    console.log(`✅ Plugin updates completed`)
  }
  
  /**
   * Get plugin information
   */
  private async getPluginInfo(pluginName: string): Promise<PluginInfo | null> {
    try {
      const packageJsonPath = join(process.cwd(), 'node_modules', pluginName, 'package.json')
      
      if (!existsSync(packageJsonPath)) {
        return null
      }
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || '',
        author: typeof packageJson.author === 'string' ? packageJson.author : packageJson.author?.name || 'Unknown',
        homepage: packageJson.homepage,
        keywords: packageJson.keywords || [],
        engines: packageJson.engines,
        tuixVersion: packageJson.engines?.tuix,
        installed: true,
        localPath: packageJsonPath
      }
      
    } catch (error) {
      if (this.verbose) {
        console.warn(`⚠️  Failed to get plugin info for ${pluginName}:`, error)
      }
      return null
    }
  }
  
  /**
   * Run a command with proper error handling
   */
  private async runCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const [command, ...commandArgs] = args
      
      if (!command) {
        reject(new Error('No command provided'))
        return
      }
      
      if (this.verbose) {
        console.log(`🔧 Running: ${args.join(' ')}`)
      }
      
      const childProcess = spawn(command, commandArgs, {
        stdio: this.verbose ? 'inherit' : 'pipe'
      })
      
      let stderr = ''
      
      if (!this.verbose) {
        childProcess.stderr?.on('data', (data: any) => {
          stderr += data.toString()
        })
      }
      
      childProcess.on('close', (code: any) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with code ${code}${stderr ? `\\n${stderr}` : ''}`))
        }
      })
      
      childProcess.on('error', reject)
    })
  }
}

export const pluginCommand = defineCommand({
  description: "Manage TUIX plugins",
  
  commands: {
    install: {
      description: "Install a plugin",
      alias: "i",
      args: {
        name: {
          type: z.string(),
          description: "Plugin name to install"
        }
      },
      options: {
        version: {
          type: z.string().optional(),
          alias: "v",
          description: "Specific version to install"
        }
      },
      handler: async ({ name, version, _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.install(name, version)
      }
    },
    
    uninstall: {
      description: "Uninstall a plugin",
      alias: "remove",
      args: {
        name: {
          type: z.string(),
          description: "Plugin name to uninstall"
        }
      },
      handler: async ({ name, _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.uninstall(name)
      }
    },
    
    list: {
      description: "List installed plugins",
      alias: "ls",
      handler: async ({ _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.list()
      }
    },
    
    search: {
      description: "Search for plugins",
      args: {
        query: {
          type: z.string(),
          description: "Search query"
        }
      },
      handler: async ({ query, _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.search(query)
      }
    },
    
    info: {
      description: "Show plugin information",
      args: {
        name: {
          type: z.string(),
          description: "Plugin name"
        }
      },
      handler: async ({ name, _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.info(name)
      }
    },
    
    update: {
      description: "Update all plugins",
      handler: async ({ _context }: any) => {
        const verbose = _context.parsedArgs.options.verbose || false
        const manager = new PluginManager(verbose)
        await manager.update()
      }
    }
  }
})
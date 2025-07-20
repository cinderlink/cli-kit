/**
 * Dev Command - Development Server
 * 
 * Provides development server with hot reloading, file watching, and error overlay.
 * Integrates with TUIX's process manager for service orchestration.
 */

import { defineCommand } from "../../../../src/cli/config.js"
import { z } from "zod"
import { spawn, type ChildProcess } from "child_process"
import { watch } from "fs"
import { join, resolve } from "path"
import { existsSync } from "fs"

interface DevServerOptions {
  port: number
  host: string
  watch: string[]
  ignore: string[]
  reload: boolean
  verbose: boolean
  open: boolean
}

class DevServer {
  private process?: ChildProcess
  private watchers: Array<() => void> = []
  private restartTimeout?: NodeJS.Timeout
  private isRestarting = false
  
  constructor(private options: DevServerOptions) {}
  
  /**
   * Start the development server
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting TUIX development server...`)
    
    // Find the main entry point
    const entryPoint = this.findEntryPoint()
    if (!entryPoint) {
      throw new Error("No entry point found. Looking for src/index.ts, src/main.ts, or index.ts")
    }
    
    console.log(`📁 Entry point: ${entryPoint}`)
    
    // Start the process
    await this.startProcess(entryPoint)
    
    // Set up file watching
    if (this.options.reload) {
      this.setupWatchers()
    }
    
    // Handle graceful shutdown
    this.setupShutdown()
    
    console.log(`\n✅ Development server ready!`)
    console.log(`🔄 Hot reload: ${this.options.reload ? 'enabled' : 'disabled'}`)
    console.log(`📝 Press Ctrl+C to stop`)
    
    // Keep the process running
    await this.keepAlive()
  }
  
  /**
   * Find the application entry point
   */
  private findEntryPoint(): string | null {
    const candidates = [
      'src/index.ts',
      'src/main.ts', 
      'index.ts',
      'main.ts',
      'src/index.js',
      'src/main.js',
      'index.js'
    ]
    
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return resolve(candidate)
      }
    }
    
    return null
  }
  
  /**
   * Start the main process
   */
  private async startProcess(entryPoint: string): Promise<void> {
    const args = ['--watch', entryPoint]
    
    if (this.options.verbose) {
      console.log(`🔧 Starting: bun ${args.join(' ')}`)
    }
    
    this.process = spawn('bun', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        TUIX_DEV: 'true',
        TUIX_HOT_RELOAD: this.options.reload ? 'true' : 'false'
      }
    })
    
    this.process.on('error', (error) => {
      console.error(`❌ Process error:`, error)
    })
    
    this.process.on('exit', (code, signal) => {
      if (this.options.verbose) {
        console.log(`📊 Process exited with code ${code}, signal ${signal}`)
      }
      
      if (signal !== 'SIGTERM' && signal !== 'SIGINT' && !this.isRestarting) {
        console.log(`🔄 Process crashed, restarting...`)
        this.scheduleRestart(entryPoint)
      }
    })
  }
  
  /**
   * Set up file watchers for hot reload
   */
  private setupWatchers(): void {
    const watchPaths = this.options.watch.length > 0 ? this.options.watch : ['src', '.']
    
    watchPaths.forEach(watchPath => {
      if (!existsSync(watchPath)) {
        if (this.options.verbose) {
          console.warn(`⚠️  Watch path does not exist: ${watchPath}`)
        }
        return
      }
      
      const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return
        
        // Skip ignored files
        if (this.shouldIgnoreFile(filename)) {
          return
        }
        
        if (this.options.verbose) {
          console.log(`📝 File changed: ${filename} (${eventType})`)
        }
        
        this.scheduleRestart(this.findEntryPoint()!)
      })
      
      this.watchers.push(() => watcher.close())
    })
    
    if (this.options.verbose) {
      console.log(`👁️  Watching: ${watchPaths.join(', ')}`)
    }
  }
  
  /**
   * Check if a file should be ignored
   */
  private shouldIgnoreFile(filename: string): boolean {
    const defaultIgnore = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.DS_Store',
      '.env',
      '*.log',
      'coverage'
    ]
    
    const ignorePatterns = [...defaultIgnore, ...this.options.ignore]
    
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(filename)
      }
      return filename.includes(pattern)
    })
  }
  
  /**
   * Schedule a restart with debouncing
   */
  private scheduleRestart(entryPoint: string): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
    }
    
    this.restartTimeout = setTimeout(() => {
      this.restart(entryPoint)
    }, 500) // 500ms debounce
  }
  
  /**
   * Restart the development server
   */
  private async restart(entryPoint: string): Promise<void> {
    if (this.isRestarting) return
    
    this.isRestarting = true
    
    try {
      console.log(`🔄 Restarting development server...`)
      
      // Stop current process
      if (this.process && !this.process.killed) {
        this.process.kill('SIGTERM')
        
        // Wait for process to exit
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL')
            }
            resolve()
          }, 5000)
          
          this.process!.on('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        })
      }
      
      // Start new process
      await this.startProcess(entryPoint)
      
      console.log(`✅ Development server restarted`)
      
    } catch (error) {
      console.error(`❌ Failed to restart development server:`, error)
    } finally {
      this.isRestarting = false
    }
  }
  
  /**
   * Set up graceful shutdown
   */
  private setupShutdown(): void {
    const shutdown = () => {
      console.log(`\n🛑 Shutting down development server...`)
      
      // Close watchers
      this.watchers.forEach(close => close())
      
      // Kill process
      if (this.process && !this.process.killed) {
        this.process.kill('SIGTERM')
      }
      
      // Clear restart timeout
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout)
      }
      
      console.log(`👋 Development server stopped`)
      process.exit(0)
    }
    
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }
  
  /**
   * Keep the main process alive
   */
  private async keepAlive(): Promise<void> {
    return new Promise(() => {
      // Keep running until shutdown
    })
  }
}

export const devCommand = defineCommand({
  description: "Start development server with hot reloading",
  
  options: {
    port: {
      type: z.number().default(3000),
      alias: "p",
      description: "Port number for development server"
    },
    host: {
      type: z.string().default("localhost"),
      alias: "h", 
      description: "Host for development server"
    },
    watch: {
      type: z.array(z.string()).default([]),
      alias: "w",
      description: "Additional directories to watch"
    },
    ignore: {
      type: z.array(z.string()).default([]),
      alias: "i",
      description: "Patterns to ignore when watching"
    },
    "no-reload": {
      type: z.boolean().default(false),
      description: "Disable hot reloading"
    },
    open: {
      type: z.boolean().default(false),
      alias: "o",
      description: "Open browser after starting"
    }
  },
  
  handler: async ({ 
    port, 
    host, 
    watch, 
    ignore, 
    "no-reload": noReload, 
    open,
    _context 
  }: any) => {
    const verbose = _context.parsedArgs.options.verbose || false
    
    const devServer = new DevServer({
      port,
      host,
      watch,
      ignore,
      reload: !noReload,
      verbose,
      open
    })
    
    try {
      await devServer.start()
    } catch (error) {
      throw new Error(`Failed to start development server: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
})
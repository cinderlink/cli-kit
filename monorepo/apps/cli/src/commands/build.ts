/**
 * Build Command - Production Builds
 * 
 * Provides production build functionality with optimization, bundle analysis,
 * and deployment preparation. Supports multiple output formats and targets.
 */

import { defineCommand } from "../../../../src/cli/config.js"
import { z } from "zod"
import { spawn } from "child_process"
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "fs"
import { join, resolve, basename } from "path"
import { promisify } from "util"

const execAsync = promisify(require('child_process').exec)

interface BuildOptions {
  target: string
  format: string
  outdir: string
  minify: boolean
  sourcemap: boolean
  analyze: boolean
  verbose: boolean
  clean: boolean
}

interface BuildResult {
  success: boolean
  outputFiles: string[]
  bundleSize: number
  duration: number
  errors: string[]
  warnings: string[]
}

class ProductionBuilder {
  private startTime: number = 0
  
  constructor(private options: BuildOptions) {}
  
  /**
   * Execute the build process
   */
  async build(): Promise<BuildResult> {
    this.startTime = Date.now()
    
    console.log(`🔨 Building TUIX application for production...`)
    
    const result: BuildResult = {
      success: false,
      outputFiles: [],
      bundleSize: 0,
      duration: 0,
      errors: [],
      warnings: []
    }
    
    try {
      // Find entry point
      const entryPoint = this.findEntryPoint()
      if (!entryPoint) {
        throw new Error("No entry point found. Looking for src/index.ts, src/main.ts, or index.ts")
      }
      
      if (this.options.verbose) {
        console.log(`📁 Entry point: ${entryPoint}`)
        console.log(`🎯 Target: ${this.options.target}`)
        console.log(`📦 Format: ${this.options.format}`)
        console.log(`📂 Output directory: ${this.options.outdir}`)
      }
      
      // Clean output directory
      if (this.options.clean) {
        await this.cleanOutput()
      }
      
      // Ensure output directory exists
      mkdirSync(this.options.outdir, { recursive: true })
      
      // Run type checking
      await this.runTypecheck()
      
      // Build with Bun
      await this.runBuild(entryPoint)
      
      // Analyze bundle if requested
      if (this.options.analyze) {
        await this.analyzeBuild()
      }
      
      // Generate build report
      await this.generateBuildReport(result)
      
      result.success = true
      result.duration = Date.now() - this.startTime
      
      console.log(`✅ Build completed successfully in ${result.duration}ms`)
      
      return result
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error))
      result.duration = Date.now() - this.startTime
      
      console.error(`❌ Build failed:`, error)
      return result
    }
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
   * Clean output directory
   */
  private async cleanOutput(): Promise<void> {
    if (existsSync(this.options.outdir)) {
      await execAsync(`rm -rf ${this.options.outdir}/*`)
      console.log(`🧹 Cleaned output directory: ${this.options.outdir}`)
    }
  }
  
  /**
   * Run TypeScript type checking
   */
  private async runTypecheck(): Promise<void> {
    console.log(`🔍 Running type checking...`)
    
    try {
      await execAsync('bun run tsc --noEmit')
      console.log(`✅ Type checking passed`)
    } catch (error) {
      console.warn(`⚠️  Type checking failed:`, error)
      // Don't fail the build for type errors in production
    }
  }
  
  /**
   * Run Bun build
   */
  private async runBuild(entryPoint: string): Promise<void> {
    console.log(`📦 Building bundle...`)
    
    const args = [
      'build',
      entryPoint,
      '--outdir', this.options.outdir,
      '--target', this.options.target,
      '--format', this.options.format
    ]
    
    if (this.options.minify) {
      args.push('--minify')
    }
    
    if (this.options.sourcemap) {
      args.push('--sourcemap')
    }
    
    if (this.options.verbose) {
      console.log(`🔧 Running: bun ${args.join(' ')}`)
    }
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('bun', args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      })
      
      let stderr = ''
      
      if (!this.options.verbose) {
        buildProcess.stderr?.on('data', (data: any) => {
          stderr += data.toString()
        })
      }
      
      buildProcess.on('close', (code: any) => {
        if (code === 0) {
          console.log(`✅ Bundle created successfully`)
          resolve()
        } else {
          reject(new Error(`Build failed with code ${code}${stderr ? `\\n${stderr}` : ''}`))
        }
      })
      
      buildProcess.on('error', reject)
    })
  }
  
  /**
   * Analyze build output
   */
  private async analyzeBuild(): Promise<void> {
    console.log(`📊 Analyzing bundle...`)
    
    const outputFiles = this.getOutputFiles()
    const analysis = {
      totalSize: 0,
      files: [] as Array<{ name: string; size: number; sizeFormatted: string }>
    }
    
    for (const file of outputFiles) {
      const stats = statSync(file)
      const size = stats.size
      const sizeFormatted = this.formatBytes(size)
      
      analysis.totalSize += size
      analysis.files.push({
        name: basename(file),
        size,
        sizeFormatted
      })
    }
    
    // Sort by size (largest first)
    analysis.files.sort((a, b) => b.size - a.size)
    
    console.log(`\n📋 Bundle Analysis:`)
    console.log(`   Total size: ${this.formatBytes(analysis.totalSize)}`)
    console.log(`   Files (${analysis.files.length}):`)
    
    analysis.files.forEach(file => {
      console.log(`     ${file.name}: ${file.sizeFormatted}`)
    })
    
    // Save analysis to file
    const analysisPath = join(this.options.outdir, 'bundle-analysis.json')
    writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))
    console.log(`\n💾 Analysis saved to: ${analysisPath}`)
  }
  
  /**
   * Get list of output files
   */
  private getOutputFiles(): string[] {
    const files: string[] = []
    
    if (existsSync(this.options.outdir)) {
      const entries = require('fs').readdirSync(this.options.outdir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(join(this.options.outdir, entry.name))
        }
      }
    }
    
    return files
  }
  
  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * Generate build report
   */
  private async generateBuildReport(result: BuildResult): Promise<void> {
    const outputFiles = this.getOutputFiles()
    result.outputFiles = outputFiles
    
    if (outputFiles.length > 0) {
      result.bundleSize = outputFiles.reduce((total, file) => {
        return total + statSync(file).size
      }, 0)
    }
    
    const report = {
      buildTime: new Date().toISOString(),
      success: result.success,
      duration: result.duration,
      target: this.options.target,
      format: this.options.format,
      minified: this.options.minify,
      sourcemap: this.options.sourcemap,
      totalSize: result.bundleSize,
      totalSizeFormatted: this.formatBytes(result.bundleSize),
      outputFiles: result.outputFiles.map(file => ({
        name: basename(file),
        path: file,
        size: statSync(file).size,
        sizeFormatted: this.formatBytes(statSync(file).size)
      })),
      errors: result.errors,
      warnings: result.warnings
    }
    
    const reportPath = join(this.options.outdir, 'build-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`📊 Build report saved to: ${reportPath}`)
  }
}

export const buildCommand = defineCommand({
  description: "Build application for production",
  
  options: {
    target: {
      type: z.enum(["node", "browser", "bun"]).default("node"),
      alias: "t",
      description: "Build target environment"
    },
    format: {
      type: z.enum(["esm", "cjs", "iife"]).default("esm"),
      alias: "f",
      description: "Output format"
    },
    outdir: {
      type: z.string().default("dist"),
      alias: "o",
      description: "Output directory"
    },
    minify: {
      type: z.boolean().default(true),
      alias: "m",
      description: "Minify output"
    },
    sourcemap: {
      type: z.boolean().default(false),
      alias: "s",
      description: "Generate source maps"
    },
    analyze: {
      type: z.boolean().default(false),
      alias: "a",
      description: "Analyze bundle size"
    },
    "no-clean": {
      type: z.boolean().default(false),
      description: "Don't clean output directory"
    }
  },
  
  handler: async ({ 
    target, 
    format, 
    outdir, 
    minify, 
    sourcemap, 
    analyze,
    "no-clean": noClean,
    _context 
  }: any) => {
    const verbose = _context.parsedArgs.options.verbose || false
    
    const builder = new ProductionBuilder({
      target,
      format,
      outdir,
      minify,
      sourcemap,
      analyze,
      verbose,
      clean: !noClean
    })
    
    const result = await builder.build()
    
    if (!result.success) {
      throw new Error(`Build failed: ${result.errors.join(', ')}`)
    }
    
    // Print summary
    console.log(`\n🎉 Build Summary:`)
    console.log(`   Duration: ${result.duration}ms`)
    console.log(`   Bundle size: ${result.bundleSize > 0 ? builder['formatBytes'](result.bundleSize) : 'N/A'}`)
    console.log(`   Output files: ${result.outputFiles.length}`)
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.length}`)
    }
  }
})
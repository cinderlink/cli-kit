/**
 * Build configuration for Tuix framework
 * 
 * Provides development and production build configurations
 * optimized for Bun runtime
 */

import type { BuildConfig } from 'bun'

interface TuixBuildConfig extends Partial<BuildConfig> {
  env?: string // Pattern for environment variables to include
}

/**
 * Base configuration shared between dev and prod
 */
const baseConfig: TuixBuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  splitting: true,
  naming: '[dir]/[name].[ext]',
  // Include public environment variables
  env: 'TUIX_PUBLIC_*',
  external: [
    // Keep these as external dependencies
    'effect',
    '@effect/*',
    'chalk',
    'ink',
    'react'
  ]
}

/**
 * Development build configuration
 */
export const developmentConfig: TuixBuildConfig = {
  ...baseConfig,
  sourcemap: 'external',
  minify: false,
  // Keep JSX for better debugging
  jsx: 'preserve'
}

/**
 * Production build configuration
 */
export const productionConfig: TuixBuildConfig = {
  ...baseConfig,
  sourcemap: 'external', // Still useful for error reporting
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true
  },
  // Transform JSX for production
  jsx: 'transform',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.TUIX_ENV': '"production"'
  }
}

/**
 * CLI binary build configuration
 * For creating standalone executables
 */
export const binaryConfig: TuixBuildConfig = {
  entrypoints: ['./bin/tuix.ts'],
  outfile: './dist/tuix',
  target: 'bun',
  compile: true,
  minify: true,
  sourcemap: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.TUIX_ENV': '"production"'
  }
}

/**
 * Library build configuration
 * For publishing to npm
 */
export const libraryConfig: TuixBuildConfig = {
  ...baseConfig,
  entrypoints: [
    './src/index.ts',
    './src/jsx/index.ts',
    './src/cli/index.ts',
    './src/core/index.ts',
    './src/ui/index.ts'
  ],
  outdir: './lib',
  target: 'node', // For broader compatibility
  format: 'esm',
  sourcemap: 'external',
  minify: false, // Keep readable for debugging
  // Generate .d.ts files
  dts: {
    resolve: true
  }
}

/**
 * Test build configuration
 * For building test utilities
 */
export const testConfig: TuixBuildConfig = {
  entrypoints: ['./src/testing/index.ts'],
  outdir: './dist/testing',
  target: 'bun',
  format: 'esm',
  sourcemap: 'inline',
  minify: false,
  external: [
    ...baseConfig.external!,
    'bun:test'
  ]
}

/**
 * Get build configuration based on environment
 */
export function getBuildConfig(env: string = process.env.NODE_ENV || 'development'): TuixBuildConfig {
  switch (env) {
    case 'production':
      return productionConfig
    case 'test':
      return testConfig
    case 'library':
      return libraryConfig
    case 'binary':
      return binaryConfig
    default:
      return developmentConfig
  }
}

/**
 * Build the project with the appropriate configuration
 */
export async function build(config?: TuixBuildConfig) {
  const finalConfig = config || getBuildConfig()
  
  console.log(`Building Tuix with ${process.env.NODE_ENV || 'development'} configuration...`)
  
  const result = await Bun.build(finalConfig as BuildConfig)
  
  if (!result.success) {
    console.error('Build failed:')
    for (const message of result.logs) {
      console.error(message)
    }
    process.exit(1)
  }
  
  console.log(`Build completed successfully! Output: ${finalConfig.outdir || finalConfig.outfile}`)
  return result
}

// Allow running directly
if (import.meta.main) {
  await build()
}
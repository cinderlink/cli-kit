#!/usr/bin/env bun
/**
 * Nested Plugins Demo - Demonstrates proper plugin nesting with scope system
 * 
 * This example shows how plugins can be nested within each other,
 * creating hierarchical command structures with proper scope isolation.
 * 
 * Usage:
 *   bun run examples/nested-plugins-demo.tsx
 *   bun run examples/nested-plugins-demo.tsx dev setup
 *   bun run examples/nested-plugins-demo.tsx dev db migrate
 *   bun run examples/nested-plugins-demo.tsx dev test run
 */

import { App, Plugin, Command, Arg, Option, jsx } from '../src/cli/components'
import { Effect } from 'effect'
import { text, vstack } from '../src/core/view'
import { style } from '../src/styling'

// =============================================================================
// Command Handlers
// =============================================================================

const setupHandler = async ({ args, options }) => {
  console.log('🔧 Setting up development environment...')
  console.log('Environment:', args.env || 'local')
  console.log('Verbose:', options.verbose || false)
  
  // Simulate setup work
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return vstack([
    text(style('✅ Development environment setup complete!').bold().green()),
    text(`Environment: ${args.env || 'local'}`),
    options.verbose && text('Running in verbose mode')
  ].filter(Boolean))
}

const migrateHandler = async ({ args, options }) => {
  console.log('🗃️  Running database migrations...')
  
  const direction = args.direction || 'up'
  const steps = options.steps || 'all'
  
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return vstack([
    text(style(`✅ Migrations complete!`).bold().green()),
    text(`Direction: ${direction}`),
    text(`Steps: ${steps}`),
    options.dryRun && text(style('(Dry run - no changes made)').italic().yellow())
  ].filter(Boolean))
}

const seedHandler = async ({ args, options }) => {
  console.log('🌱 Seeding database...')
  
  const dataset = args.dataset || 'default'
  
  await new Promise(resolve => setTimeout(resolve, 600))
  
  return vstack([
    text(style('✅ Database seeded successfully!').bold().green()),
    text(`Dataset: ${dataset}`),
    options.fresh && text('Fresh seed (cleared existing data)')
  ].filter(Boolean))
}

const testHandler = async ({ args, options }) => {
  console.log('🧪 Running tests...')
  
  const pattern = args.pattern || '**/*.test.ts'
  
  await new Promise(resolve => setTimeout(resolve, 1200))
  
  return vstack([
    text(style('✅ All tests passed!').bold().green()),
    text(`Pattern: ${pattern}`),
    text('Tests: 42 passed, 0 failed'),
    options.coverage && text('Coverage: 87.3%')
  ].filter(Boolean))
}

const coverageHandler = async ({ options }) => {
  console.log('📊 Generating coverage report...')
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return vstack([
    text(style('📊 Coverage Report').bold().cyan()),
    text(''),
    text('File               | Coverage | Lines'),
    text('------------------ | -------- | -----'),
    text('src/index.ts       |   92.3% | 120/130'),
    text('src/utils.ts       |   87.5% | 70/80'),
    text('src/components.ts  |   95.0% | 190/200'),
    text(''),
    text(style('Total: 91.2%').bold().green()),
    options.open && text('\nOpening coverage report in browser...')
  ].filter(Boolean))
}

// =============================================================================
// CLI Application
// =============================================================================

export default jsx(() => (
  <App name="dev-tools" version="1.0.0" description="Development tools CLI with nested plugins">
    
    {/* Top-level dev plugin */}
    <Plugin name="dev" description="Development tools">
      
      {/* Direct command under dev */}
      <Command 
        name="setup" 
        description="Setup development environment"
        handler={setupHandler}
      >
        <Arg name="env" description="Environment name" />
        <Option name="verbose" type="boolean" description="Enable verbose output" />
      </Command>
      
      {/* Nested database plugin */}
      <Plugin name="db" description="Database tools">
        <Command 
          name="migrate" 
          description="Run database migrations"
          handler={migrateHandler}
        >
          <Arg name="direction" description="Migration direction (up/down)" />
          <Option name="steps" type="string" description="Number of steps or 'all'" />
          <Option name="dry-run" type="boolean" description="Show what would be done" />
        </Command>
        
        <Command 
          name="seed" 
          description="Seed the database"
          handler={seedHandler}
        >
          <Arg name="dataset" description="Dataset to seed" />
          <Option name="fresh" type="boolean" description="Clear existing data first" />
        </Command>
      </Plugin>
      
      {/* Nested test plugin */}
      <Plugin name="test" description="Testing tools">
        <Command 
          name="run" 
          description="Run tests"
          handler={testHandler}
        >
          <Arg name="pattern" description="Test file pattern" />
          <Option name="coverage" type="boolean" description="Generate coverage report" />
          <Option name="watch" type="boolean" description="Watch for changes" />
        </Command>
        
        <Command 
          name="coverage" 
          description="Generate coverage report"
          handler={coverageHandler}
        >
          <Option name="open" type="boolean" description="Open report in browser" />
          <Option name="format" type="string" description="Report format (html/json/lcov)" />
        </Command>
      </Plugin>
      
    </Plugin>
    
    {/* Another top-level plugin to show sibling relationships */}
    <Plugin name="deploy" description="Deployment tools">
      <Command 
        name="staging" 
        description="Deploy to staging"
        handler={async () => text('Deploying to staging...')}
      />
      <Command 
        name="production" 
        description="Deploy to production"
        handler={async () => text('Deploying to production...')}
      />
    </Plugin>
    
  </App>
))

// =============================================================================
// Expected Command Structure:
// =============================================================================
// 
// This example should create the following command hierarchy:
// 
// dev-tools
// ├── dev
// │   ├── setup <env> [--verbose]
// │   ├── db
// │   │   ├── migrate <direction> [--steps <n>] [--dry-run]
// │   │   └── seed <dataset> [--fresh]
// │   └── test
// │       ├── run <pattern> [--coverage] [--watch]
// │       └── coverage [--open] [--format <fmt>]
// └── deploy
//     ├── staging
//     └── production
//
// Commands are accessed as:
// - dev-tools dev setup
// - dev-tools dev db migrate
// - dev-tools dev db seed
// - dev-tools dev test run
// - dev-tools dev test coverage
// - dev-tools deploy staging
// - dev-tools deploy production
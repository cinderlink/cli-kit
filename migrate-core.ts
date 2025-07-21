#!/usr/bin/env bun
/**
 * Core Module Migration Script
 * 
 * Enforces project rules during migration:
 * - No duplicates
 * - Update imports
 * - Run tests
 * - Delete old files
 */

import { readdir, readFile, writeFile, mkdir, rm, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, relative } from 'path'
import { $ } from 'bun'

const PROJECT_ROOT = process.cwd()
const RULES_CHECK_INTERVAL = 5

interface MigrationStep {
  name: string
  from: string
  to: string
  updateImports?: Array<{ from: string; to: string }>
}

class CoreMigrator {
  private stepCount = 0
  
  async migrate(steps: MigrationStep[]) {
    console.log('🚀 Starting Core Module Migration')
    
    for (const step of steps) {
      await this.executeStep(step)
      
      // Check rules every 5 steps
      if (++this.stepCount % RULES_CHECK_INTERVAL === 0) {
        await this.enforceRules()
      }
    }
    
    console.log('✅ Migration Complete!')
  }
  
  private async executeStep(step: MigrationStep) {
    console.log(`\n📦 ${step.name}`)
    
    // Check source exists
    const sourcePath = join(PROJECT_ROOT, step.from)
    if (!existsSync(sourcePath)) {
      console.log(`  ⚠️  Source not found: ${step.from}`)
      return
    }
    
    // Create target directory
    const targetPath = join(PROJECT_ROOT, step.to)
    const targetDir = dirname(targetPath)
    await mkdir(targetDir, { recursive: true })
    
    // Move file/directory
    console.log(`  📁 Moving ${step.from} → ${step.to}`)
    await rename(sourcePath, targetPath)
    
    // Update imports
    if (step.updateImports) {
      console.log('  🔄 Updating imports...')
      await this.updateImports(step.updateImports)
    }
    
    // Run tests
    console.log('  🧪 Running tests...')
    const testResult = await $`bun test --timeout 5000`.quiet().nothrow()
    if (testResult.exitCode !== 0) {
      console.error('  ❌ Tests failed! Rolling back...')
      await rename(targetPath, sourcePath)
      throw new Error('Tests failed after migration')
    }
    
    console.log('  ✅ Step complete')
  }
  
  private async updateImports(updates: Array<{ from: string; to: string }>) {
    const files = await this.findTypeScriptFiles('src')
    
    for (const file of files) {
      let content = await readFile(file, 'utf-8')
      let modified = false
      
      for (const { from, to } of updates) {
        const regex = new RegExp(
          `from ['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
          'g'
        )
        if (regex.test(content)) {
          content = content.replace(regex, `from '${to}'`)
          modified = true
        }
      }
      
      if (modified) {
        await writeFile(file, content)
      }
    }
  }
  
  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...await this.findTypeScriptFiles(path))
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(path)
      }
    }
    
    return files
  }
  
  private async enforceRules() {
    console.log('\n🔍 Enforcing Project Rules...')
    
    // Check for duplicate implementations
    const duplicates = await this.findDuplicates()
    if (duplicates.length > 0) {
      console.error('❌ Found duplicate implementations:')
      duplicates.forEach(d => console.error(`  - ${d}`))
      throw new Error('Duplicate implementations found')
    }
    
    // Check for version suffixes
    const badNames = await this.findBadNames()
    if (badNames.length > 0) {
      console.error('❌ Found files with version suffixes:')
      badNames.forEach(n => console.error(`  - ${n}`))
      throw new Error('Files with version suffixes found')
    }
    
    // Check for stubs
    const stubs = await this.findStubs()
    if (stubs.length > 0) {
      console.error('❌ Found stub files:')
      stubs.forEach(s => console.error(`  - ${s}`))
      throw new Error('Stub files found')
    }
    
    console.log('✅ All rules passed')
  }
  
  private async findDuplicates(): Promise<string[]> {
    // Look for files with similar names in different locations
    const files = await this.findTypeScriptFiles('src')
    const nameMap = new Map<string, string[]>()
    
    for (const file of files) {
      const name = file.split('/').pop()!.replace(/\.(ts|tsx)$/, '')
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      nameMap.get(name)!.push(file)
    }
    
    const duplicates: string[] = []
    for (const [name, paths] of nameMap) {
      if (paths.length > 1) {
        duplicates.push(`${name}: ${paths.join(', ')}`)
      }
    }
    
    return duplicates
  }
  
  private async findBadNames(): Promise<string[]> {
    const files = await this.findTypeScriptFiles('src')
    const badPatterns = /-v2|-simple|-enhanced|-basic|-new|-old|-legacy|-main/
    
    return files.filter(file => badPatterns.test(file))
  }
  
  private async findStubs(): Promise<string[]> {
    const files = await this.findTypeScriptFiles('src')
    const stubs: string[] = []
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      if (
        content.includes('// TODO: Implement') ||
        content.includes('// STUB') ||
        content.includes('throw new Error("Not implemented")')
      ) {
        stubs.push(file)
      }
    }
    
    return stubs
  }
}

// Define migration steps
const MIGRATION_STEPS: MigrationStep[] = [
  // Step 1: Create directories is handled by shell script
  
  // Step 2: Move scope system
  {
    name: 'Move scope manager',
    from: 'src/scope/manager.ts',
    to: 'src/core/model/scope/manager.ts',
    updateImports: [
      { from: '../scope/manager', to: '../core/model/scope/manager' },
      { from: '../../scope/manager', to: '../../core/model/scope/manager' },
    ]
  },
  {
    name: 'Move scope types',
    from: 'src/scope/types.ts',
    to: 'src/core/model/scope/types.ts',
    updateImports: [
      { from: '../scope/types', to: '../core/model/scope/types' },
      { from: '../../scope/types', to: '../../core/model/scope/types' },
    ]
  },
  
  // Add more steps as needed...
]

// Run migration
if (import.meta.main) {
  const migrator = new CoreMigrator()
  await migrator.migrate(MIGRATION_STEPS)
}
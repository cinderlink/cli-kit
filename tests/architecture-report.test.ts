import { test, expect, describe } from "bun:test"
import { readdir } from "node:fs/promises"
import { join } from "node:path"

/**
 * Architectural Report
 * 
 * Reports on architectural rule compliance without failing builds
 * This helps track progress toward architectural goals
 */

// Helper to recursively find files
async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const results: string[] = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...await findFiles(fullPath, pattern))
        }
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath)
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  
  return results
}

// Helper to check file content for patterns
async function findFilesWithPattern(dir: string, filePattern: RegExp, contentPattern: RegExp): Promise<string[]> {
  const files = await findFiles(dir, filePattern)
  const matches: string[] = []
  
  for (const file of files) {
    const content = await Bun.file(file).text()
    if (contentPattern.test(content)) {
      matches.push(file)
    }
  }
  
  return matches
}

describe("Architectural Compliance Report", () => {
  const srcDir = join(process.cwd(), "src")
  const report: Record<string, { rule: string; count: number; files?: string[] }> = {}
  
  test("Generate compliance report", async () => {
    // Check for multiple implementations
    const multipleImpls = await findFiles(srcDir, /-(v2|simple|enhanced|basic)\.(ts|tsx)$/)
    report["multiple-implementations"] = {
      rule: "No multiple implementations (-v2, -simple, etc)",
      count: multipleImpls.length,
      files: multipleImpls.slice(0, 5) // Show first 5
    }
    
    // Check for test files in wrong location
    const wrongTestFiles = await findFiles(srcDir, /^test-.*\.(ts|tsx)$/)
    report["test-files"] = {
      rule: "No test-*.ts files outside test directories",
      count: wrongTestFiles.length,
      files: wrongTestFiles.slice(0, 5)
    }
    
    // Check module boundaries
    const cliFiles = await findFiles(join(srcDir, 'cli'), /\.(ts|tsx)$/)
    let cliViolations = 0
    for (const file of cliFiles) {
      const content = await Bun.file(file).text()
      if (/from ['"]@jsx\/|from ['"]\.\.\/jsx\/|from ['"]\.\.\/\.\.\/jsx\//.test(content)) {
        cliViolations++
      }
    }
    report["cli-jsx-imports"] = {
      rule: "CLI module should not import from JSX",
      count: cliViolations
    }
    
    const jsxFiles = await findFiles(join(srcDir, 'jsx'), /\.(ts|tsx)$/)
    let jsxViolations = 0
    for (const file of jsxFiles) {
      const content = await Bun.file(file).text()
      if (/from ['"]@cli\/|from ['"]\.\.\/cli\/|from ['"]\.\.\/\.\.\/cli\//.test(content)) {
        jsxViolations++
      }
    }
    report["jsx-cli-imports"] = {
      rule: "JSX module should not import from CLI",
      count: jsxViolations
    }
    
    // Check for stores outside designated locations
    const storeFiles = await findFilesWithPattern(
      srcDir,
      /\.(ts|tsx)$/,
      /\$state\(/
    )
    const storeViolations = storeFiles.filter(f => {
      return !(f.includes('/stores/') || f.includes('/debug/') || f.includes('.test.'))
    })
    report["store-locations"] = {
      rule: "Stores should be in designated locations",
      count: storeViolations.length,
      files: storeViolations.slice(0, 5)
    }
    
    // Print report
    console.log("\n=== Architectural Compliance Report ===\n")
    
    let totalViolations = 0
    for (const [key, data] of Object.entries(report)) {
      totalViolations += data.count
      const status = data.count === 0 ? "✅" : "❌"
      console.log(`${status} ${data.rule}: ${data.count} violations`)
      if (data.files && data.files.length > 0) {
        data.files.forEach(f => console.log(`   - ${f.replace(process.cwd() + '/', '')}`))
        if (data.count > data.files.length) {
          console.log(`   ... and ${data.count - data.files.length} more`)
        }
      }
    }
    
    console.log(`\nTotal violations: ${totalViolations}`)
    console.log("\nNote: This is a report, not a failure. Use this to track architectural improvements.\n")
    
    // Test passes regardless of violations
    expect(true).toBe(true)
  })
})
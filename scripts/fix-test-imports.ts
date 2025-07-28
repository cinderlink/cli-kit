#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs"
import { dirname, relative, join } from "path"
import { Glob } from "bun"

// Find all test files
const glob = new Glob("**/*.test.ts")
const testFiles = Array.from(glob.scanSync({
  cwd: process.cwd(),
  onlyFiles: true
})).filter(f => !f.includes("node_modules") && !f.includes("dist") && !f.includes(".tuix"))

console.log(`Found ${testFiles.length} test files`)

// Mapping of aliases to source directories
const aliasMap: Record<string, string> = {
  "@cli": "src/cli",
  "@core": "src/core",
  "@jsx": "src/jsx",
  "@ui": "src/ui",
  "@testing": "src/testing",
  "@config": "src/config",
  "@logger": "src/logger",
  "@debug": "src/debug",
  "@health": "src/health",
  "@optimization": "src/optimization",
  "@process-manager": "src/process-manager",
  "@scope": "src/scope",
  "@services": "src/services",
  "@styling": "src/styling",
  "@layout": "src/layout",
  "@utils": "src/utils",
  "@reactivity": "src/reactivity"
}

let totalFixed = 0

for (const testFile of testFiles) {
  const content = readFileSync(testFile, "utf-8")
  const lines = content.split("\n")
  let modified = false
  
  const updatedLines = lines.map(line => {
    // Match import statements with aliases
    const match = line.match(/^(import\s+(?:type\s+)?(?:\{[^}]+\}|[^"']+)\s+from\s+["'])(@[^/]+)(\/[^"']*)?(['"])/)
    
    if (match) {
      const [, prefix, alias, subpath = "", suffix] = match
      const srcDir = aliasMap[alias]
      
      if (srcDir) {
        // Calculate relative path from test file to source
        const testDir = dirname(testFile)
        const targetPath = join(srcDir, subpath)
        let relativePath = relative(testDir, targetPath)
        
        // Ensure relative path starts with ./ or ../
        if (!relativePath.startsWith(".")) {
          relativePath = "./" + relativePath
        }
        
        // Replace backslashes with forward slashes (for Windows)
        relativePath = relativePath.replace(/\\/g, "/")
        
        modified = true
        console.log(`  ${testFile}: ${alias}${subpath} -> ${relativePath}`)
        
        return `${prefix}${relativePath}${suffix}`
      }
    }
    
    return line
  })
  
  if (modified) {
    writeFileSync(testFile, updatedLines.join("\n"))
    totalFixed++
  }
}

console.log(`\nFixed imports in ${totalFixed} files`)
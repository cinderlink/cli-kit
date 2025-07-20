#!/usr/bin/env bun
/**
 * Script to remove JSX pragma comments from all TSX files
 */

import { Glob } from "bun"
import { readFile, writeFile } from "fs/promises"

async function removePragmas() {
  console.log("Removing JSX pragmas from .tsx files...")
  
  // Find all .tsx files
  const glob = new Glob("**/*.tsx")
  const files: string[] = []
  
  for await (const file of glob.scan({
    cwd: process.cwd(),
    absolute: true,
    onlyFiles: true
  })) {
    if (!file.includes("node_modules") && !file.includes("dist") && !file.includes(".tuix")) {
      files.push(file)
    }
  }
  
  console.log(`Found ${files.length} .tsx files`)
  
  let modifiedCount = 0
  
  for (const file of files) {
    const content = await readFile(file, "utf-8")
    
    // Remove pragma comments
    // Matches: /** @jsx jsx */ or /* @jsx jsx */ or /** @jsxImportSource ... */
    const newContent = content
      .replace(/\/\*\*?\s*@jsx\s+\w+\s*\*\//g, '')
      .replace(/\/\*\*?\s*@jsxImportSource\s+[^\s]+\s*\*\//g, '')
      .replace(/\/\*\*?\s*@jsxFactory\s+\w+\s*\*\//g, '')
      .replace(/\/\*\*?\s*@jsxFragment\s+\w+\s*\*\//g, '')
      // Clean up multiple empty lines that might result
      .replace(/\n\n\n+/g, '\n\n')
      // Clean up leading newlines at start of file
      .replace(/^\n+/, '')
    
    if (content !== newContent) {
      await writeFile(file, newContent)
      modifiedCount++
      console.log(`✓ ${file.replace(process.cwd() + '/', '')}`)
    }
  }
  
  console.log(`\nModified ${modifiedCount} files`)
}

removePragmas().catch(console.error)
/**
 * JSX Configuration Validator
 * 
 * Detects and diagnoses JSX configuration issues
 */

import * as fs from "fs"
import * as path from "path"

export interface JSXConfigIssue {
  level: 'error' | 'warning' | 'info'
  message: string
  file?: string
  suggestion?: string
}

export function validateJSXConfig(projectRoot: string = process.cwd()): JSXConfigIssue[] {
  const issues: JSXConfigIssue[] = []
  
  // Check tsconfig.json
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
      const compilerOptions = tsconfig.compilerOptions || {}
      
      // Check jsx setting
      if (!compilerOptions.jsx) {
        issues.push({
          level: 'error',
          message: 'Missing "jsx" in tsconfig.json compilerOptions',
          file: 'tsconfig.json',
          suggestion: 'Add "jsx": "react-jsx" to compilerOptions'
        })
      } else if (compilerOptions.jsx !== 'react-jsx' && compilerOptions.jsx !== 'react-jsxdev') {
        issues.push({
          level: 'warning',
          message: `Unexpected jsx setting: "${compilerOptions.jsx}"`,
          file: 'tsconfig.json',
          suggestion: 'Use "jsx": "react-jsx" for production or "react-jsxdev" for development'
        })
      }
      
      // Check jsxImportSource
      if (!compilerOptions.jsxImportSource) {
        issues.push({
          level: 'error',
          message: 'Missing "jsxImportSource" in tsconfig.json',
          file: 'tsconfig.json',
          suggestion: 'Add "jsxImportSource": "tuix" or "jsxImportSource": "."'
        })
      } else if (compilerOptions.jsxImportSource === '@cinderlink/cli-kit') {
        issues.push({
          level: 'error',
          message: 'Outdated jsxImportSource: "@cinderlink/cli-kit"',
          file: 'tsconfig.json',
          suggestion: 'Change to "jsxImportSource": "tuix"'
        })
      }
    } catch (_e) {
      issues.push({
        level: 'error',
        message: 'Failed to parse tsconfig.json',
        file: 'tsconfig.json',
        suggestion: 'Ensure tsconfig.json is valid JSON'
      })
    }
  }
  
  // Check bunfig.toml
  const bunfigPath = path.join(projectRoot, 'bunfig.toml')
  if (fs.existsSync(bunfigPath)) {
    const bunfig = fs.readFileSync(bunfigPath, 'utf-8')
    
    // Simple TOML parsing for jsx section
    if (bunfig.includes('[jsx]')) {
      const jsxSection = bunfig.split('[jsx]')[1]?.split('[')[0] || ''
      
      if (jsxSection.includes('@cinderlink/cli-kit')) {
        issues.push({
          level: 'error',
          message: 'Outdated importSource in bunfig.toml',
          file: 'bunfig.toml',
          suggestion: 'Change importSource to "tuix" or "."'
        })
      }
      
      if (!jsxSection.includes('factory')) {
        issues.push({
          level: 'warning',
          message: 'Missing factory setting in bunfig.toml [jsx] section',
          file: 'bunfig.toml',
          suggestion: 'Add: factory = "jsx"'
        })
      }
    }
  }
  
  // Check for jsx-runtime exports
  const jsxRuntimePath = path.join(projectRoot, 'jsx-runtime.ts')
  const jsxRuntimeJsPath = path.join(projectRoot, 'jsx-runtime.js')
  
  if (!fs.existsSync(jsxRuntimePath) && !fs.existsSync(jsxRuntimeJsPath)) {
    issues.push({
      level: 'error',
      message: 'Missing jsx-runtime.ts in project root',
      file: 'jsx-runtime.ts',
      suggestion: 'Ensure jsx-runtime.ts exists and exports jsx, jsxs, jsxDEV, and Fragment'
    })
  }
  
  // Check package.json exports
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      if (!packageJson.exports?.['./jsx-runtime']) {
        issues.push({
          level: 'error',
          message: 'Missing "./jsx-runtime" export in package.json',
          file: 'package.json',
          suggestion: 'Add exports["./jsx-runtime"] pointing to jsx-runtime.ts'
        })
      }
    } catch (_e) {
      // Ignore parse errors for package.json
    }
  }
  
  return issues
}

export function formatConfigIssues(issues: JSXConfigIssue[]): string {
  if (issues.length === 0) {
    return '✅ JSX configuration looks good!'
  }
  
  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warning')
  const infos = issues.filter(i => i.level === 'info')
  
  let output = '🔧 JSX Configuration Issues Found:\n\n'
  
  if (errors.length > 0) {
    output += '❌ Errors:\n'
    errors.forEach(issue => {
      output += `  • ${issue.message}\n`
      if (issue.file) output += `    File: ${issue.file}\n`
      if (issue.suggestion) output += `    Fix: ${issue.suggestion}\n`
      output += '\n'
    })
  }
  
  if (warnings.length > 0) {
    output += '⚠️  Warnings:\n'
    warnings.forEach(issue => {
      output += `  • ${issue.message}\n`
      if (issue.file) output += `    File: ${issue.file}\n`
      if (issue.suggestion) output += `    Fix: ${issue.suggestion}\n`
      output += '\n'
    })
  }
  
  if (infos.length > 0) {
    output += 'ℹ️  Info:\n'
    infos.forEach(issue => {
      output += `  • ${issue.message}\n`
      if (issue.suggestion) output += `    ${issue.suggestion}\n`
      output += '\n'
    })
  }
  
  return output
}

/**
 * Validate JSX element is a proper View
 */
export function validateJSXElement(element: any, context: string = 'unknown'): void {
  if (!element) {
    throw new Error(`JSX element is null or undefined in ${context}`)
  }
  
  if (typeof element !== 'object') {
    throw new Error(`JSX element is not an object (got ${typeof element}) in ${context}`)
  }
  
  if (typeof element.render !== 'function') {
    console.error('Invalid JSX element:', {
      context,
      type: typeof element,
      keys: Object.keys(element),
      element
    })
    
    // Check for common issues
    const suggestions: string[] = []
    
    if (element.type && element.props) {
      suggestions.push('Element looks like unprocessed JSX. Check jsxImportSource configuration.')
    }
    
    if (element._tag || element.tag) {
      suggestions.push('Element might be an Effect or other non-View object.')
    }
    
    if (Array.isArray(element)) {
      suggestions.push('Element is an array. Wrap multiple elements in a container like <vstack> or <hstack>.')
    }
    
    // Check JSX config
    const configIssues = validateJSXConfig()
    if (configIssues.length > 0) {
      suggestions.push('\nJSX Configuration Issues:')
      suggestions.push(formatConfigIssues(configIssues))
    }
    
    throw new Error(
      `JSX element is not a valid View (missing render() method) in ${context}\n` +
      (suggestions.length > 0 ? '\nPossible issues:\n' + suggestions.join('\n') : '')
    )
  }
}
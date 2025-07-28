/**
 * Health Check System for Tuix
 *
 * Provides environment validation, dependency checking, and project diagnostics
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { Effect } from 'effect'

export interface HealthCheck {
  name: string
  description: string
  check: () => Promise<HealthResult>
  severity: 'error' | 'warning' | 'info'
  fix?: () => Promise<void>
  fixDescription?: string
}

export interface HealthResult {
  success: boolean
  message: string
  details?: string[]
  value?: string | number
}

export interface HealthReport {
  overall: 'healthy' | 'warnings' | 'errors'
  checks: Array<{
    name: string
    result: HealthResult
    severity: 'error' | 'warning' | 'info'
    fixAvailable: boolean
  }>
  summary: {
    total: number
    passed: number
    warnings: number
    errors: number
  }
}

/**
 * Core environment checks
 */
export const coreHealthChecks: HealthCheck[] = [
  {
    name: 'bun-runtime',
    description: 'Check if Bun runtime is available',
    severity: 'error',
    check: async () => {
      try {
        const result = Bun.spawnSync(['bun', '--version'])
        if (result.exitCode === 0) {
          const version = result.stdout.toString().trim()
          return {
            success: true,
            message: `Bun runtime available`,
            value: version,
          }
        } else {
          return {
            success: false,
            message: 'Bun runtime not found or not working',
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Bun runtime not available',
          details: [error instanceof Error ? error.message : String(error)],
        }
      }
    },
    fix: async () => {
      console.log('Please install Bun from https://bun.sh')
      console.log('curl -fsSL https://bun.sh/install | bash')
    },
    fixDescription: 'Install Bun runtime',
  },

  {
    name: 'bun-version',
    description: 'Check if Bun version is compatible',
    severity: 'warning',
    check: async () => {
      try {
        const result = Bun.spawnSync(['bun', '--version'])
        if (result.exitCode === 0) {
          const version = result.stdout.toString().trim()
          const [major, minor] = version.split('.').map(Number)

          // Require Bun 1.0.0 or higher
          if (major !== undefined && major >= 1) {
            return {
              success: true,
              message: `Bun version ${version} is compatible`,
              value: version,
            }
          } else {
            return {
              success: false,
              message: `Bun version ${version} is outdated. Recommended: 1.0.0+`,
              value: version,
            }
          }
        }
        return {
          success: false,
          message: 'Could not check Bun version',
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to check Bun version',
          details: [error instanceof Error ? error.message : String(error)],
        }
      }
    },
    fix: async () => {
      console.log('Update Bun to the latest version:')
      console.log('bun upgrade')
    },
    fixDescription: 'Update Bun to latest version',
  },

  {
    name: 'node-compatibility',
    description: 'Check Node.js compatibility (for fallback)',
    severity: 'info',
    check: async () => {
      try {
        const result = Bun.spawnSync(['node', '--version'])
        if (result.exitCode === 0) {
          const version = result.stdout.toString().trim()
          return {
            success: true,
            message: `Node.js available as fallback`,
            value: version,
          }
        }
        return {
          success: false,
          message: 'Node.js not available (optional for Bun projects)',
        }
      } catch (error) {
        return {
          success: false,
          message: 'Node.js not available (optional)',
          details: ['This is optional when using Bun'],
        }
      }
    },
  },

  {
    name: 'typescript',
    description: 'Check TypeScript availability',
    severity: 'warning',
    check: async () => {
      try {
        const result = Bun.spawnSync(['bun', 'tsc', '--version'])
        if (result.exitCode === 0) {
          const version = result.stdout.toString().trim()
          return {
            success: true,
            message: `TypeScript available`,
            value: version,
          }
        }
        return {
          success: false,
          message: 'TypeScript not available',
        }
      } catch (error) {
        return {
          success: false,
          message: 'TypeScript not installed',
          details: ['TypeScript is recommended for Tuix development'],
        }
      }
    },
    fix: async () => {
      console.log('Install TypeScript:')
      console.log('bun add -D typescript')
    },
    fixDescription: 'Install TypeScript',
  },

  {
    name: 'terminal-support',
    description: 'Check terminal capabilities',
    severity: 'info',
    check: async () => {
      const capabilities = []
      const issues = []

      // Check color support
      if (process.env.COLORTERM || process.env.TERM?.includes('color')) {
        capabilities.push('Color support')
      } else {
        issues.push('Limited color support')
      }

      // Check terminal size
      if (process.stdout.columns && process.stdout.rows) {
        capabilities.push(`Terminal size: ${process.stdout.columns}x${process.stdout.rows}`)
      } else {
        issues.push('Cannot detect terminal size')
      }

      // Check if TTY
      if (process.stdout.isTTY) {
        capabilities.push('Interactive TTY')
      } else {
        issues.push('Not running in interactive terminal')
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0
            ? 'Terminal capabilities are good'
            : `Terminal has limitations: ${issues.join(', ')}`,
        details: capabilities,
      }
    },
  },
]

/**
 * Project-specific health checks
 */
export const projectHealthChecks: HealthCheck[] = [
  {
    name: 'package-json',
    description: 'Check if package.json exists and is valid',
    severity: 'error',
    check: async () => {
      try {
        const packagePath = path.join(process.cwd(), 'package.json')
        await fs.access(packagePath)

        const content = await fs.readFile(packagePath, 'utf-8')
        const pkg = JSON.parse(content)

        const issues = []
        const details = []

        if (!pkg.name) issues.push('Missing package name')
        if (!pkg.version) issues.push('Missing version')
        if (!pkg.type || pkg.type !== 'module') issues.push("Should use 'type: module'")

        details.push(`Name: ${pkg.name || 'missing'}`)
        details.push(`Version: ${pkg.version || 'missing'}`)
        details.push(`Type: ${pkg.type || 'missing'}`)

        return {
          success: issues.length === 0,
          message:
            issues.length === 0
              ? 'package.json is valid'
              : `package.json issues: ${issues.join(', ')}`,
          details,
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          return {
            success: false,
            message: 'No package.json found',
          }
        }
        return {
          success: false,
          message: 'Invalid package.json',
          details: [error instanceof Error ? error.message : String(error)],
        }
      }
    },
    fix: async () => {
      console.log('Initialize a new package.json:')
      console.log('bun init')
    },
    fixDescription: 'Create package.json',
  },

  {
    name: 'tsconfig-json',
    description: 'Check TypeScript configuration',
    severity: 'warning',
    check: async () => {
      try {
        const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
        await fs.access(tsconfigPath)

        const content = await fs.readFile(tsconfigPath, 'utf-8')
        const tsconfig = JSON.parse(content)

        const issues: string[] = []
        const recommendations: string[] = []

        // Check JSX settings
        if (tsconfig.compilerOptions?.jsx !== 'react-jsx') {
          recommendations.push("Consider using 'react-jsx' for JSX")
        }

        if (tsconfig.compilerOptions?.jsxImportSource !== 'tuix') {
          recommendations.push("Set jsxImportSource to 'tuix' for JSX support")
        }

        // Check module settings
        if (tsconfig.compilerOptions?.module !== 'ES2020') {
          recommendations.push("Use 'ES2020' module for better Bun compatibility")
        }

        if (tsconfig.compilerOptions?.moduleResolution !== 'bundler') {
          recommendations.push("Use 'bundler' moduleResolution for Bun")
        }

        return {
          success: issues.length === 0,
          message:
            issues.length === 0
              ? 'TypeScript configuration is good'
              : `TypeScript config issues: ${issues.join(', ')}`,
          details: recommendations.length > 0 ? recommendations : undefined,
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          return {
            success: false,
            message: 'No tsconfig.json found',
          }
        }
        return {
          success: false,
          message: 'Invalid tsconfig.json',
          details: [error instanceof Error ? error.message : String(error)],
        }
      }
    },
    fix: async () => {
      console.log('Create a Tuix-compatible tsconfig.json:')
      console.log('tuix init --tsconfig-only')
    },
    fixDescription: 'Create TypeScript config',
  },

  {
    name: 'tuix-dependency',
    description: 'Check if Tuix is properly installed',
    severity: 'error',
    check: async () => {
      try {
        const packagePath = path.join(process.cwd(), 'package.json')
        const content = await fs.readFile(packagePath, 'utf-8')
        const pkg = JSON.parse(content)

        const tuixVersion = pkg.dependencies?.tuix || pkg.devDependencies?.tuix

        if (!tuixVersion) {
          return {
            success: false,
            message: 'Tuix not found in dependencies',
          }
        }

        // Try to resolve tuix
        try {
          const tuixPath = path.join(process.cwd(), 'node_modules', 'tuix', 'package.json')
          await fs.access(tuixPath)

          const tuixPkg = JSON.parse(await fs.readFile(tuixPath, 'utf-8'))

          return {
            success: true,
            message: 'Tuix is properly installed',
            value: tuixPkg.version,
          }
        } catch {
          return {
            success: false,
            message: 'Tuix dependency not installed',
            details: [`Listed in package.json as ${tuixVersion} but not found in node_modules`],
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Could not check Tuix dependency',
          details: [error instanceof Error ? error.message : String(error)],
        }
      }
    },
    fix: async () => {
      console.log('Install Tuix:')
      console.log('bun add tuix')
    },
    fixDescription: 'Install Tuix dependency',
  },

  {
    name: 'effect-dependency',
    description: 'Check if Effect is available',
    severity: 'error',
    check: async () => {
      try {
        const packagePath = path.join(process.cwd(), 'package.json')
        const content = await fs.readFile(packagePath, 'utf-8')
        const pkg = JSON.parse(content)

        const effectVersion = pkg.dependencies?.effect || pkg.devDependencies?.effect

        if (!effectVersion) {
          return {
            success: false,
            message: 'Effect not found in dependencies',
          }
        }

        return {
          success: true,
          message: 'Effect dependency available',
          value: effectVersion,
        }
      } catch (error) {
        return {
          success: false,
          message: 'Could not check Effect dependency',
        }
      }
    },
    fix: async () => {
      console.log('Install Effect:')
      console.log('bun add effect')
    },
    fixDescription: 'Install Effect dependency',
  },
]

/**
 * Run health checks and generate report
 */
export async function runHealthChecks(
  checks: HealthCheck[] = [...coreHealthChecks, ...projectHealthChecks],
  options: {
    includeInfo?: boolean
    fixable?: boolean
  } = {}
): Promise<HealthReport> {
  const results: HealthReport['checks'] = []

  for (const check of checks) {
    if (!options.includeInfo && check.severity === 'info') continue
    if (options.fixable && !check.fix) continue

    try {
      const result = await check.check()
      results.push({
        name: check.name,
        result,
        severity: check.severity,
        fixAvailable: !!check.fix,
      })
    } catch (error) {
      results.push({
        name: check.name,
        result: {
          success: false,
          message: 'Health check failed',
          details: [error instanceof Error ? error.message : String(error)],
        },
        severity: check.severity,
        fixAvailable: !!check.fix,
      })
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.result.success).length,
    warnings: results.filter(r => !r.result.success && r.severity === 'warning').length,
    errors: results.filter(r => !r.result.success && r.severity === 'error').length,
  }

  const overall = summary.errors > 0 ? 'errors' : summary.warnings > 0 ? 'warnings' : 'healthy'

  return {
    overall,
    checks: results,
    summary,
  }
}

/**
 * Get health check by name
 */
export function getHealthCheck(name: string): HealthCheck | undefined {
  return [...coreHealthChecks, ...projectHealthChecks].find(check => check.name === name)
}

/**
 * Check if we're in a Tuix project
 */
export async function isInTuixProject(): Promise<boolean> {
  try {
    const packagePath = path.join(process.cwd(), 'package.json')
    const content = await fs.readFile(packagePath, 'utf-8')
    const pkg = JSON.parse(content)

    return !!(pkg.dependencies?.tuix || pkg.devDependencies?.tuix)
  } catch {
    return false
  }
}

/**
 * Detect project type
 */
export async function detectProjectType(): Promise<{
  type: 'tuix' | 'node' | 'bun' | 'unknown'
  hasTypeScript: boolean
  hasJSX: boolean
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' | 'unknown'
}> {
  let type: 'tuix' | 'node' | 'bun' | 'unknown' = 'unknown'
  let hasTypeScript = false
  let hasJSX = false
  let packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' | 'unknown' = 'unknown'

  try {
    // Check package.json
    const packagePath = path.join(process.cwd(), 'package.json')
    const content = await fs.readFile(packagePath, 'utf-8')
    const pkg = JSON.parse(content)

    // Detect project type
    if (pkg.dependencies?.tuix || pkg.devDependencies?.tuix || pkg.name === 'tuix') {
      type = 'tuix'
    } else if (pkg.type === 'module' || pkg.dependencies?.bun) {
      type = 'bun'
    } else {
      type = 'node'
    }

    // Check for TypeScript
    hasTypeScript = !!(
      pkg.dependencies?.typescript ||
      pkg.devDependencies?.typescript ||
      (await fs
        .access(path.join(process.cwd(), 'tsconfig.json'))
        .then(() => true)
        .catch(() => false))
    )

    // Check for JSX (basic heuristic)
    hasJSX = !!(
      pkg.dependencies?.react ||
      pkg.devDependencies?.react ||
      (await fs.readdir(process.cwd())).some(file => file.endsWith('.tsx') || file.endsWith('.jsx'))
    )

    // Detect package manager
    if (
      await fs
        .access(path.join(process.cwd(), 'bun.lockb'))
        .then(() => true)
        .catch(() => false)
    ) {
      packageManager = 'bun'
    } else if (
      await fs
        .access(path.join(process.cwd(), 'yarn.lock'))
        .then(() => true)
        .catch(() => false)
    ) {
      packageManager = 'yarn'
    } else if (
      await fs
        .access(path.join(process.cwd(), 'pnpm-lock.yaml'))
        .then(() => true)
        .catch(() => false)
    ) {
      packageManager = 'pnpm'
    } else if (
      await fs
        .access(path.join(process.cwd(), 'package-lock.json'))
        .then(() => true)
        .catch(() => false)
    ) {
      packageManager = 'npm'
    }
  } catch (error) {
    // No package.json or other error
  }

  return {
    type,
    hasTypeScript,
    hasJSX,
    packageManager,
  }
}

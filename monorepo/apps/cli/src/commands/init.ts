/**
 * Init Command - Project Scaffolding
 * 
 * Provides project initialization with template selection, dependency installation,
 * and configuration setup. Supports various project types and templates.
 */

import { defineCommand } from "../../../../src/cli/config.js"
import { z } from "zod"
import { Effect } from "effect"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join, resolve } from "path"
import { spawn } from "child_process"
import { promisify } from "util"

// Available project templates
const TEMPLATES = {
  "basic": {
    name: "Basic TUIX App",
    description: "Simple TUIX application with basic components",
    dependencies: ["@tuix/core", "@tuix/components"],
    devDependencies: ["@types/node", "typescript"]
  },
  "cli": {
    name: "CLI Application",
    description: "Command-line interface application with argument parsing",
    dependencies: ["@tuix/core", "@tuix/components", "@tuix/cli"],
    devDependencies: ["@types/node", "typescript"]
  },
  "dashboard": {
    name: "Dashboard Application",
    description: "Real-time dashboard with monitoring and charts",
    dependencies: ["@tuix/core", "@tuix/components", "@tuix/plugin-process-manager", "@tuix/plugin-logger"],
    devDependencies: ["@types/node", "typescript"]
  },
  "plugin": {
    name: "TUIX Plugin",
    description: "Plugin template for extending TUIX applications",
    dependencies: ["@tuix/core"],
    devDependencies: ["@types/node", "typescript"]
  }
} as const

type TemplateType = keyof typeof TEMPLATES

// Template files
const TEMPLATE_FILES = {
  basic: {
    "src/index.ts": `import { runApp } from '@tuix/core'
import { Box, Text } from '@tuix/components'

const app = {
  init: () => ({ count: 0 }),
  
  update: (model: { count: number }, msg: any) => {
    switch (msg.type) {
      case 'INCREMENT':
        return { count: model.count + 1 }
      case 'DECREMENT':
        return { count: model.count - 1 }
      default:
        return model
    }
  },
  
  view: (model: { count: number }) => 
    Box({
      padding: 2,
      border: 'rounded',
      children: [
        Text({ text: 'Welcome to TUIX!' }),
        Text({ text: \`Count: \${model.count}\` }),
        Text({ text: 'Press + to increment, - to decrement, q to quit' })
      ]
    })
}

runApp(app)
`,
    "package.json": (name: string) => JSON.stringify({
      name,
      version: "1.0.0",
      description: "TUIX application",
      main: "src/index.ts",
      scripts: {
        start: "bun src/index.ts",
        dev: "bun --watch src/index.ts",
        build: "bun build src/index.ts --outdir=dist",
        test: "bun test"
      },
      dependencies: TEMPLATES.basic.dependencies.reduce((acc, dep) => {
        acc[dep] = "^1.0.0"
        return acc
      }, {} as Record<string, string>),
      devDependencies: TEMPLATES.basic.devDependencies.reduce((acc, dep) => {
        acc[dep] = "^20.0.0"
        return acc
      }, {} as Record<string, string>)
    }, null, 2)
  },
  
  cli: {
    "src/index.ts": `#!/usr/bin/env bun
import { defineConfig, runCLI } from '@tuix/cli'
import { z } from 'zod'

const config = defineConfig({
  name: '{{name}}',
  version: '1.0.0',
  description: 'My TUIX CLI application',
  
  commands: {
    hello: {
      description: 'Say hello',
      options: {
        name: {
          type: z.string().default('World'),
          description: 'Name to greet'
        }
      },
      handler: async ({ name }) => {
        console.log(\`Hello, \${name}!\`)
      }
    }
  }
})

runCLI(config)
`,
    "package.json": (name: string) => JSON.stringify({
      name,
      version: "1.0.0",
      description: "TUIX CLI application",
      main: "src/index.ts",
      bin: {
        [name]: "dist/index.js"
      },
      scripts: {
        start: "bun src/index.ts",
        dev: "bun --watch src/index.ts",
        build: "bun build src/index.ts --outdir=dist --target=node",
        test: "bun test"
      },
      dependencies: TEMPLATES.cli.dependencies.reduce((acc, dep) => {
        acc[dep] = "^1.0.0"
        return acc
      }, {} as Record<string, string>),
      devDependencies: TEMPLATES.cli.devDependencies.reduce((acc, dep) => {
        acc[dep] = "^20.0.0"
        return acc
      }, {} as Record<string, string>)
    }, null, 2)
  },
  
  dashboard: {
    "src/index.ts": `import { runApp } from '@tuix/core'
import { Box, Text, Table } from '@tuix/components'
import { ProcessManager } from '@tuix/plugin-process-manager'
import { Logger } from '@tuix/plugin-logger'

const app = {
  init: () => ({
    processes: [],
    logs: [],
    selectedTab: 'processes'
  }),
  
  update: (model: any, msg: any) => {
    switch (msg.type) {
      case 'SWITCH_TAB':
        return { ...model, selectedTab: msg.tab }
      case 'UPDATE_PROCESSES':
        return { ...model, processes: msg.processes }
      case 'NEW_LOG':
        return { ...model, logs: [msg.log, ...model.logs.slice(0, 99)] }
      default:
        return model
    }
  },
  
  view: (model: any) => 
    Box({
      padding: 1,
      children: [
        Text({ text: '📊 {{name}} Dashboard', style: { bold: true } }),
        model.selectedTab === 'processes' ? 
          ProcessManager({ processes: model.processes }) :
          Box({
            children: model.logs.map((log: any) => 
              Text({ text: log.message })
            )
          })
      ]
    })
}

runApp(app)
`,
    "package.json": (name: string) => JSON.stringify({
      name,
      version: "1.0.0",
      description: "TUIX dashboard application",
      main: "src/index.ts",
      scripts: {
        start: "bun src/index.ts",
        dev: "bun --watch src/index.ts",
        build: "bun build src/index.ts --outdir=dist",
        test: "bun test"
      },
      dependencies: TEMPLATES.dashboard.dependencies.reduce((acc, dep) => {
        acc[dep] = "^1.0.0"
        return acc
      }, {} as Record<string, string>),
      devDependencies: TEMPLATES.dashboard.devDependencies.reduce((acc, dep) => {
        acc[dep] = "^20.0.0"
        return acc
      }, {} as Record<string, string>)
    }, null, 2)
  },
  
  plugin: {
    "src/index.ts": `import { definePlugin } from '@tuix/core'

const plugin = definePlugin({
  name: '{{name}}',
  version: '1.0.0',
  description: 'Custom TUIX plugin',
  
  install: async (context) => {
    console.log('Plugin {{name}} installed')
  },
  
  uninstall: async (context) => {
    console.log('Plugin {{name}} uninstalled')  
  }
})

export default plugin
`,
    "package.json": (name: string) => JSON.stringify({
      name,
      version: "1.0.0",
      description: "TUIX plugin",
      main: "src/index.ts",
      scripts: {
        build: "bun build src/index.ts --outdir=dist",
        dev: "bun --watch src/index.ts",
        test: "bun test"
      },
      peerDependencies: {
        "@tuix/core": "^1.0.0"
      },
      devDependencies: TEMPLATES.plugin.devDependencies.reduce((acc, dep) => {
        acc[dep] = "^20.0.0"
        return acc
      }, {} as Record<string, string>)
    }, null, 2)
  }
}

/**
 * Execute a shell command asynchronously
 */
const execAsync = promisify(require('child_process').exec)

/**
 * Install dependencies using Bun
 */
async function installDependencies(projectPath: string, verbose: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('bun', ['install'], {
      cwd: projectPath,
      stdio: verbose ? 'inherit' : 'pipe'
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Dependency installation failed with code ${code}`))
      }
    })
    
    process.on('error', reject)
  })
}

/**
 * Create project structure and files
 */
function createProject(name: string, template: TemplateType, targetPath: string): void {
  // Create directory structure
  mkdirSync(targetPath, { recursive: true })
  mkdirSync(join(targetPath, 'src'), { recursive: true })
  
  // Write template files
  const templateFiles = TEMPLATE_FILES[template]
  if (templateFiles) {
    Object.entries(templateFiles).forEach(([filePath, content]) => {
      const fullPath = join(targetPath, filePath)
      mkdirSync(join(fullPath, '..'), { recursive: true })
      
      let fileContent = typeof content === 'function' ? content(name) : content
      
      // Replace template variables
      fileContent = fileContent.replace(/\{\{name\}\}/g, name)
      
      writeFileSync(fullPath, fileContent)
    })
  }
  
  // Create additional files
  writeFileSync(join(targetPath, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      outDir: "dist",
      rootDir: "src"
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
  }, null, 2))
  
  writeFileSync(join(targetPath, 'README.md'), 
`# ${name}

A TUIX application generated with template: ${template}

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Start development
bun dev

# Build for production
bun run build
\`\`\`

## Template: ${TEMPLATES[template].name}

${TEMPLATES[template].description}

## Learn More

- [TUIX Documentation](https://tuix.dev)
- [TUIX Examples](https://github.com/tuix/examples)
- [TUIX Plugin Development](https://tuix.dev/plugins)
`)
  
  writeFileSync(join(targetPath, '.gitignore'), 
`node_modules/
dist/
*.log
.DS_Store
.env
coverage/
`)
}

export const initCommand = defineCommand({
  description: "Initialize a new TUIX project",
  
  args: {
    name: {
      type: z.string(),
      description: "Project name"
    }
  },
  
  options: {
    template: {
      type: z.enum(Object.keys(TEMPLATES) as [TemplateType, ...TemplateType[]]).default("basic"),
      alias: "t",
      description: "Project template to use"
    },
    path: {
      type: z.string().optional(),
      alias: "p", 
      description: "Target directory (defaults to project name)"
    },
    "skip-install": {
      type: z.boolean().default(false),
      description: "Skip dependency installation"
    },
    force: {
      type: z.boolean().default(false),
      alias: "f",
      description: "Overwrite existing directory"
    }
  },
  
  handler: async ({ name, template, path, "skip-install": skipInstall, force, _context }: any) => {
    const verbose = _context.parsedArgs.options.verbose || false
    const targetPath = resolve(path || name)
    
    // Validate project name
    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
      throw new Error("Project name must start with a letter and contain only letters, numbers, hyphens, and underscores")
    }
    
    // Check if directory exists
    if (existsSync(targetPath)) {
      if (!force) {
        throw new Error(`Directory '${targetPath}' already exists. Use --force to overwrite.`)
      }
    }
    
    console.log(`🚀 Creating TUIX project '${name}' with template '${template}'`)
    console.log(`📁 Target directory: ${targetPath}`)
    
    if (verbose) {
      console.log(`📋 Template: ${(TEMPLATES as any)[template].name}`)
      console.log(`📋 Description: ${(TEMPLATES as any)[template].description}`)
    }
    
    try {
      // Create project structure
      createProject(name, template, targetPath)
      console.log(`✅ Project structure created`)
      
      // Install dependencies
      if (!skipInstall) {
        console.log(`📦 Installing dependencies...`)
        await installDependencies(targetPath, verbose)
        console.log(`✅ Dependencies installed`)
      }
      
      // Success message
      console.log(`\n🎉 Project '${name}' created successfully!`)
      console.log(`\nNext steps:`)
      console.log(`  cd ${path || name}`)
      if (skipInstall) {
        console.log(`  bun install`)
      }
      console.log(`  bun dev`)
      console.log(`\nHappy coding! 🚀`)
      
    } catch (error) {
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
})
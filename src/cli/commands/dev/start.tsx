/**
 * Dev Start Command
 * Using JSX components for rich output
 */

import { Effect } from "effect"
import { Box, Text, Spinner } from "../../../ui/components"
import { ProcessManager } from "../../../process-manager/manager"
import { createConsoleLogger } from "../../../logger"
import type { CLIContext } from "../../types"

export default async function handler({ options }: CLIContext) {
  // Parse options
  const services = options.services ? 
    (options.services as string).split(',').map(s => s.trim()) :
    ['typecheck', 'test-watch']
  
  const coverage = options.coverage || false
  const interactive = options.interactive || false
  const timeout = options.timeout as number | undefined

  // Render startup UI
  const StartupView = () => (
    <Box flexDirection="column" gap={1}>
      <Text color="green" bold>🚀 Starting development environment...</Text>
      <Box flexDirection="column" paddingLeft={2}>
        <Text>📦 Services: {services.join(", ")}</Text>
        {coverage && <Text>📊 Coverage: enabled</Text>}
        {interactive && <Text>🎛️  Interactive: enabled</Text>}
        {timeout && <Text>⏱️  Timeout: {timeout}s</Text>}
      </Box>
      <Box marginTop={1}>
        <Spinner type="dots" />
        <Text> Initializing services...</Text>
      </Box>
    </Box>
  )

  // Display startup UI
  console.log(StartupView())

  // Initialize process manager
  const logger = createConsoleLogger("info", { 
    colorize: true, 
    prettyPrint: true, 
    showEmoji: true 
  })

  const pm = new ProcessManager({
    logger: logger.child("dev"),
    logDir: "./logs",
    autoSave: true
  })

  await pm.init()

  // Service configurations
  const devServices: Record<string, any> = {
    typecheck: {
      name: "typecheck",
      command: "bun run tsc --noEmit --watch",
      autorestart: false,
      group: "quality",
      logPreset: "tsc",
      healthCheck: { pattern: "Found \\d+ errors|No errors found", timeout: 10000 }
    },
    "test-watch": {
      name: "test-watch", 
      command: coverage ? "bun test --watch --coverage" : "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "bun",
      healthCheck: { pattern: "\\d+ pass|\\d+ fail", timeout: 8000 }
    },
    lint: {
      name: "lint",
      command: "bun run lint --watch",
      autorestart: false,
      group: "quality",
      logPreset: "eslint",
      healthCheck: { pattern: "✓.*no problems|✗.*problems?", timeout: 8000 }
    },
    build: {
      name: "build",
      command: "bun run build --watch",
      autorestart: true,
      group: "build",
      logPreset: "vite",
      healthCheck: { pattern: "built in|build completed", timeout: 15000 }
    }
  }

  // Start services
  const startedServices: string[] = []
  
  for (const serviceName of services) {
    const serviceConfig = devServices[serviceName]
    if (!serviceConfig) {
      console.log(<Text color="yellow">⚠️  Unknown service: {serviceName}, skipping...</Text>)
      continue
    }
    
    const existing = pm.list().find(p => p.name === serviceName)
    if (!existing) {
      await pm.add(serviceConfig)
    }
    
    try {
      await pm.start(serviceName)
      startedServices.push(serviceName)
      console.log(<Text color="green">✅ Started {serviceName}</Text>)
    } catch (error) {
      console.log(<Text color="red">❌ Failed to start {serviceName}: {String(error)}</Text>)
    }
  }

  // Summary view
  const SummaryView = () => (
    <Box flexDirection="column" marginTop={1} borderStyle="round" padding={1}>
      <Text color="green" bold>✨ Development environment started!</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>📊 Started {startedServices.length}/{services.length} services</Text>
        <Text color="dim">📊 Use 'tuix pm status --watch' for interactive monitoring</Text>
        <Text color="dim">📝 Use 'tuix logs --merge {startedServices.join(",")}' for combined logs</Text>
        <Text color="dim">⏹️  Use 'tuix dev stop' to stop all services</Text>
      </Box>
    </Box>
  )

  console.log(SummaryView())

  // Handle interactive mode
  if (interactive) {
    console.log(<Text color="blue" marginTop={1}>🎛️  Starting interactive monitor...</Text>)
    // Import and start process monitor component
    const { ProcessMonitor } = await import("../../../process-manager/components/ProcessMonitor")
    const { runApp } = await import("../../../core/runtime")
    const { LiveServices } = await import("../../../core/services/impl")
    
    const component = {
      init: Effect.succeed([{}, []] as const),
      update: () => Effect.succeed([{}, []] as const),
      view: () => ProcessMonitor({ 
        manager: pm, 
        showLogs: true, 
        showStats: true,
        refreshInterval: 1000 
      }),
      subscription: () => Effect.succeed([])
    }
    
    await Effect.runPromise(
      runApp(component).pipe(
        Effect.provide(LiveServices),
        Effect.catchAll(() => Effect.void),
        Effect.orDie
      )
    )
  }
}
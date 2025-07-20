/**
 * Process Manager Module
 * 
 * Native Bun IPC process management - no wrapper processes needed
 */

// Re-export all types
export type {
  ProcessConfig,
  ProcessState,
  ProcessLog,
  ProcessManagerConfig
} from "./types"

// Export the native process manager
export { ProcessManager } from "./manager"
export { setupManagedProcess } from "./manager"

// Import for type reference
import type { ProcessManagerConfig } from "./types"
import { ProcessManager } from "./manager"

// Export process manager creation utilities
export async function createProcessManager(
  config?: ProcessManagerConfig,
  cwd?: string
): Promise<ProcessManager> {
  const manager = new ProcessManager(config, cwd)
  await manager.init()
  return manager
}

// Export components
export { ProcessMonitor } from "./components/ProcessMonitor"

// Export the plugin
export { ProcessManagerPlugin } from "./plugin"

// Export default manager
export default ProcessManager
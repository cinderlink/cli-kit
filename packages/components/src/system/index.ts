/**
 * System Components Module
 * 
 * Exports for system monitoring and process management components.
 */

// Main component
export { 
  processMonitor, 
  simpleProcessMonitor, 
  detailedProcessMonitor, 
  compactProcessMonitor,
  defaultProcessMonitorStyles,
  type ProcessMonitorModel,
  type ProcessMonitorMsg,
  type ProcessMonitorStyles
} from "./process-monitor"

// Supporting classes and utilities
export { SystemMetricsCollector, ProcessCollector, getPlatform } from "./metrics-collector"
export { ProcessTree } from "./process-tree"
export { ProcessActions, InteractiveProcessManager, ProcessActionError } from "./process-actions"

// Types
export type {
  ProcessInfo,
  DetailedProcessInfo,
  ProcessStatus,
  ProcessTreeNode,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  ProcessFilter,
  ProcessSort,
  ProcessMonitorProps,
  ProcessMonitorState,
  ProcessAction,
  ProcessActionResult,
  MetricsHistory,
  ProcessMonitorConfig,
  FileDescriptor,
  NetworkConnection,
  MemoryRegion,
  SwapMetrics,
  FilesystemMetrics,
  NetworkInterfaceMetrics,
  LoadAverageMetrics,
  HistoryPoint
} from "./types"
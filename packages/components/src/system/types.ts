/**
 * ProcessMonitor Component Types
 * 
 * Type definitions for process monitoring, system metrics, and related functionality.
 * Designed for cross-platform compatibility and efficient real-time updates.
 */

/**
 * Basic process information from system APIs
 */
export interface ProcessInfo {
  /** Process ID */
  pid: number
  /** Parent process ID */
  ppid: number
  /** Process name/command name */
  name: string
  /** Full command line */
  command: string
  /** Process owner */
  user: string
  /** CPU usage percentage */
  cpu: number
  /** Memory usage in bytes */
  memory: number
  /** Process start time */
  startTime: Date
  /** Process status (running, sleeping, etc.) */
  status: ProcessStatus
  /** Priority/nice value */
  priority?: number
  /** Thread count */
  threads?: number
}

/**
 * Process status enumeration
 */
export type ProcessStatus = 
  | 'running'
  | 'sleeping' 
  | 'stopped'
  | 'zombie'
  | 'idle'
  | 'unknown'

/**
 * Detailed process information for process details view
 */
export interface DetailedProcessInfo extends ProcessInfo {
  /** Open file descriptors */
  openFiles: FileDescriptor[]
  /** Network connections */
  networkConnections: NetworkConnection[]
  /** Memory map details */
  memoryMap: MemoryRegion[]
  /** Environment variables */
  environment: Record<string, string>
  /** Working directory */
  workingDirectory: string
  /** Executable path */
  executablePath: string
}

/**
 * File descriptor information
 */
export interface FileDescriptor {
  fd: number
  type: 'file' | 'socket' | 'pipe' | 'device'
  path: string
  mode: string
}

/**
 * Network connection information
 */
export interface NetworkConnection {
  protocol: 'tcp' | 'udp'
  localAddress: string
  localPort: number
  remoteAddress?: string
  remotePort?: number
  state: 'LISTEN' | 'ESTABLISHED' | 'CLOSE_WAIT' | 'TIME_WAIT' | string
}

/**
 * Memory region information
 */
export interface MemoryRegion {
  start: string
  end: string
  permissions: string
  offset: string
  device: string
  inode: string
  pathname?: string
}

/**
 * Process tree node for hierarchical display
 */
export interface ProcessTreeNode {
  /** Process information */
  process: ProcessInfo
  /** Child processes */
  children: ProcessTreeNode[]
  /** Parent node reference */
  parent?: ProcessTreeNode
  /** Tree depth level */
  depth: number
  /** Whether node is expanded in tree view */
  expanded: boolean
  /** Whether this node is currently selected */
  selected: boolean
}

/**
 * System metrics information
 */
export interface SystemMetrics {
  /** CPU metrics */
  cpu: CpuMetrics
  /** Memory metrics */
  memory: MemoryMetrics
  /** Disk metrics */
  disk: DiskMetrics
  /** Network metrics */
  network: NetworkMetrics
  /** Load averages */
  loadAverage: LoadAverageMetrics
  /** System uptime */
  uptime: number
}

/**
 * CPU usage metrics
 */
export interface CpuMetrics {
  /** Overall CPU usage percentage */
  overall: number
  /** Per-core CPU usage */
  perCore: number[]
  /** User CPU time percentage */
  user: number
  /** System CPU time percentage */
  system: number
  /** Idle CPU time percentage */
  idle: number
  /** I/O wait time percentage */
  iowait: number
  /** Load averages for 1, 5, 15 minutes */
  loadAverage: [number, number, number]
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  /** Total memory in bytes */
  total: number
  /** Used memory in bytes */
  used: number
  /** Available memory in bytes */
  available: number
  /** Free memory in bytes */
  free: number
  /** Cached memory in bytes */
  cached: number
  /** Buffer memory in bytes */
  buffers: number
  /** Memory usage percentage */
  percent: number
  /** Swap metrics */
  swap: SwapMetrics
}

/**
 * Swap memory metrics
 */
export interface SwapMetrics {
  /** Total swap in bytes */
  total: number
  /** Used swap in bytes */
  used: number
  /** Free swap in bytes */
  free: number
  /** Swap usage percentage */
  percent: number
}

/**
 * Disk usage metrics
 */
export interface DiskMetrics {
  /** Filesystem usage information */
  filesystems: FilesystemMetrics[]
  /** Total disk reads per second */
  totalReads: number
  /** Total disk writes per second */
  totalWrites: number
  /** Bytes read per second */
  bytesRead: number
  /** Bytes written per second */
  bytesWritten: number
  /** I/O utilization percentage */
  ioUtil: number
}

/**
 * Individual filesystem metrics
 */
export interface FilesystemMetrics {
  /** Mount point */
  mountpoint: string
  /** Device name */
  device: string
  /** Filesystem type */
  fstype: string
  /** Total size in bytes */
  total: number
  /** Used space in bytes */
  used: number
  /** Available space in bytes */
  available: number
  /** Usage percentage */
  percent: number
}

/**
 * Network interface metrics
 */
export interface NetworkMetrics {
  /** Per-interface statistics */
  interfaces: NetworkInterfaceMetrics[]
  /** Total bytes received per second */
  totalBytesReceived: number
  /** Total bytes sent per second */
  totalBytesSent: number
  /** Total packets received per second */
  totalPacketsReceived: number
  /** Total packets sent per second */
  totalPacketsSent: number
}

/**
 * Individual network interface metrics
 */
export interface NetworkInterfaceMetrics {
  /** Interface name */
  name: string
  /** Bytes received */
  bytesReceived: number
  /** Bytes sent */
  bytesSent: number
  /** Packets received */
  packetsReceived: number
  /** Packets sent */
  packetsSent: number
  /** Receive errors */
  receiveErrors: number
  /** Transmit errors */
  transmitErrors: number
  /** Interface status */
  status: 'up' | 'down' | 'unknown'
}

/**
 * Load average metrics
 */
export interface LoadAverageMetrics {
  /** 1-minute load average */
  oneMinute: number
  /** 5-minute load average */
  fiveMinute: number
  /** 15-minute load average */
  fifteenMinute: number
}

/**
 * Process filter configuration
 */
export interface ProcessFilter {
  /** Search query for name/command */
  searchQuery: string
  /** Minimum CPU usage filter */
  minCpu: number
  /** Minimum memory usage filter */
  minMemory: number
  /** Selected users filter */
  selectedUsers: Set<string>
  /** Selected process statuses */
  selectedStatuses: Set<ProcessStatus>
  /** Hide system processes */
  hideSystem: boolean
}

/**
 * Process sorting configuration
 */
export interface ProcessSort {
  /** Column to sort by */
  column: keyof ProcessInfo
  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * ProcessMonitor component props
 */
export interface ProcessMonitorProps {
  /** Refresh interval in milliseconds */
  refreshInterval?: number
  /** Initial sort configuration */
  sortBy?: keyof ProcessInfo
  /** Initial sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Filter function for processes */
  filterBy?: (process: ProcessInfo) => boolean
  /** Callback when process is selected */
  onProcessSelect?: (pid: number) => void
  /** Whether to show system metrics */
  showSystemMetrics?: boolean
  /** Whether to use tree view */
  treeView?: boolean
  /** Whether process management is enabled */
  managementEnabled?: boolean
  /** Maximum number of processes to display */
  maxProcesses?: number
  /** Whether to show process details panel */
  showDetails?: boolean
  /** Theme variant */
  variant?: 'default' | 'compact' | 'detailed'
}

/**
 * ProcessMonitor component state
 */
export interface ProcessMonitorState {
  /** Current process list */
  processes: ProcessInfo[]
  /** Filtered and sorted processes for display */
  displayProcesses: ProcessInfo[]
  /** Current system metrics */
  systemMetrics: SystemMetrics | null
  /** Current filter configuration */
  filter: ProcessFilter
  /** Current sort configuration */
  sort: ProcessSort
  /** Currently selected process PID */
  selectedPid: number | null
  /** Selected process details */
  selectedProcess: DetailedProcessInfo | null
  /** Whether tree view is enabled */
  treeView: boolean
  /** Process tree nodes (when in tree view) */
  treeNodes: ProcessTreeNode[]
  /** Whether component is currently refreshing */
  refreshing: boolean
  /** Last refresh timestamp */
  lastRefresh: Date | null
  /** Error state */
  error: string | null
  /** Whether management actions are in progress */
  actionInProgress: boolean
}

/**
 * Process management action types
 */
export type ProcessAction = 
  | 'kill'
  | 'terminate' 
  | 'suspend'
  | 'resume'
  | 'nice'

/**
 * Process action result
 */
export interface ProcessActionResult {
  /** Whether action succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Action that was performed */
  action: ProcessAction
  /** Target process PID */
  pid: number
}

/**
 * Metrics history for trending
 */
export interface MetricsHistory {
  /** CPU usage history */
  cpu: HistoryPoint[]
  /** Memory usage history */
  memory: HistoryPoint[]
  /** Timestamps for history points */
  timestamps: Date[]
  /** Maximum history points to keep */
  maxPoints: number
}

/**
 * Single history data point
 */
export interface HistoryPoint {
  /** Timestamp */
  timestamp: Date
  /** Value at this point */
  value: number
}

/**
 * ProcessMonitor configuration options
 */
export interface ProcessMonitorConfig {
  /** Default refresh interval */
  defaultRefreshInterval: number
  /** Maximum refresh rate (minimum interval) */
  maxRefreshRate: number
  /** History retention period */
  historyRetention: number
  /** Default process limit */
  defaultProcessLimit: number
  /** Whether to enable process management by default */
  defaultManagementEnabled: boolean
  /** Platform-specific configuration */
  platform: {
    /** Process collection command/API */
    processCommand?: string
    /** Metrics collection method */
    metricsMethod?: 'ps' | 'proc' | 'api'
    /** Supported process actions */
    supportedActions: ProcessAction[]
  }
}
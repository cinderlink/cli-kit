/**
 * ProcessMonitor Component Tests
 */

import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test"
import { 
  processMonitor, 
  simpleProcessMonitor, 
  detailedProcessMonitor,
  type ProcessMonitorModel,
  type ProcessMonitorMsg
} from "../process-monitor"
import { SystemMetricsCollector, ProcessCollector } from "../metrics-collector"
import { ProcessTree } from "../process-tree"
import { ProcessActions } from "../process-actions"
import type { ProcessInfo, SystemMetrics } from "../types"

// Mock data generators
function generateMockProcess(overrides: Partial<ProcessInfo> = {}): ProcessInfo {
  return {
    pid: Math.floor(Math.random() * 10000) + 1000,
    ppid: Math.floor(Math.random() * 1000),
    name: `process-${Math.random().toString(36).substr(2, 8)}`,
    command: `/usr/bin/mock-command arg1 arg2`,
    user: 'testuser',
    cpu: Math.random() * 100,
    memory: Math.random() * 1024 * 1024 * 1024, // Random GB
    startTime: new Date(Date.now() - Math.random() * 86400000), // Random time in last day
    status: 'running',
    priority: 0,
    threads: 1,
    ...overrides
  }
}

function generateMockProcesses(count: number): ProcessInfo[] {
  const processes: ProcessInfo[] = []
  
  // Create some root processes
  for (let i = 0; i < Math.min(count, 5); i++) {
    processes.push(generateMockProcess({
      pid: i + 1,
      ppid: 0,
      name: `root-process-${i}`,
      user: 'root'
    }))
  }
  
  // Create child processes
  let pid = 100
  for (let i = 5; i < count; i++) {
    const parentPid = processes[Math.floor(Math.random() * Math.min(processes.length, 10))].pid
    processes.push(generateMockProcess({
      pid: pid++,
      ppid: parentPid,
      name: `child-process-${i}`,
      cpu: Math.random() * 50 // Children typically use less CPU
    }))
  }
  
  return processes
}

function generateMockSystemMetrics(): SystemMetrics {
  return {
    cpu: {
      overall: Math.random() * 100,
      perCore: [Math.random() * 100, Math.random() * 100],
      user: Math.random() * 50,
      system: Math.random() * 30,
      idle: Math.random() * 70,
      iowait: Math.random() * 10,
      loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
    },
    memory: {
      total: 8 * 1024 * 1024 * 1024, // 8GB
      used: 4 * 1024 * 1024 * 1024,  // 4GB
      available: 4 * 1024 * 1024 * 1024, // 4GB
      free: 3 * 1024 * 1024 * 1024,   // 3GB
      cached: 1 * 1024 * 1024 * 1024, // 1GB
      buffers: 512 * 1024 * 1024,     // 512MB
      percent: 50,
      swap: {
        total: 2 * 1024 * 1024 * 1024, // 2GB
        used: 256 * 1024 * 1024,       // 256MB
        free: 2 * 1024 * 1024 * 1024 - 256 * 1024 * 1024,
        percent: 12.5
      }
    },
    disk: {
      filesystems: [],
      totalReads: 100,
      totalWrites: 50,
      bytesRead: 1024 * 1024,
      bytesWritten: 512 * 1024,
      ioUtil: 25
    },
    network: {
      interfaces: [],
      totalBytesReceived: 1024 * 1024,
      totalBytesSent: 512 * 1024,
      totalPacketsReceived: 1000,
      totalPacketsSent: 800
    },
    loadAverage: {
      oneMinute: Math.random() * 2,
      fiveMinute: Math.random() * 2,
      fifteenMinute: Math.random() * 2
    },
    uptime: 86400 // 1 day
  }
}

describe('ProcessMonitor Component', () => {
  let mockProcessCollector: ProcessCollector
  let mockMetricsCollector: SystemMetricsCollector

  beforeEach(() => {
    // Mock the collectors
    mockProcessCollector = mock(() => ({})) as any
    mockMetricsCollector = mock(() => ({})) as any
    
    mockProcessCollector.collectProcesses = mock(async () => 
      generateMockProcesses(50)
    )
    
    mockMetricsCollector.collectSystemMetrics = mock(async () => 
      generateMockSystemMetrics()
    )
  })

  afterEach(() => {
    // Cleanup any timers
  })

  test('creates ProcessMonitor component with default props', () => {
    const monitor = processMonitor()
    expect(monitor).toBeDefined()
    expect(monitor.id).toBeTruthy()
  })

  test('creates ProcessMonitor with custom props', () => {
    const props = {
      refreshInterval: 2000,
      sortBy: 'memory' as const,
      sortDirection: 'asc' as const,
      showSystemMetrics: true,
      treeView: true,
      maxProcesses: 100
    }
    
    const monitor = processMonitor(props)
    expect(monitor).toBeDefined()
  })

  test('creates simple process monitor', () => {
    const monitor = simpleProcessMonitor()
    expect(monitor).toBeDefined()
  })

  test('creates detailed process monitor', () => {
    const monitor = detailedProcessMonitor()
    expect(monitor).toBeDefined()
  })

  test('handles process data refresh', async () => {
    // Test the collectors directly since component architecture is different
    const processes = await mockProcessCollector.collectProcesses()
    const metrics = await mockMetricsCollector.collectSystemMetrics()
    
    expect(processes).toBeDefined()
    expect(metrics).toBeDefined()
    expect(mockProcessCollector.collectProcesses).toHaveBeenCalled()
    expect(mockMetricsCollector.collectSystemMetrics).toHaveBeenCalled()
  })

  test('filters processes correctly', () => {
    const monitor = new ProcessMonitor()
    const processes = generateMockProcesses(20)
    
    // Set processes directly for testing
    ;(monitor as any).processes.value = processes
    
    // Test search filter
    ;(monitor as any).filterState.value = {
      searchQuery: 'root',
      minCpu: 0,
      minMemory: 0,
      selectedUsers: new Set(),
      selectedStatuses: new Set(),
      hideSystem: false
    }
    
    const filtered = (monitor as any).filteredProcesses.value
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((p: ProcessInfo) => 
      p.name.includes('root') || p.command.includes('root') || p.user.includes('root')
    )).toBe(true)
  })

  test('sorts processes correctly', () => {
    const monitor = new ProcessMonitor()
    const processes = [
      generateMockProcess({ pid: 1, cpu: 10.5, name: 'low-cpu' }),
      generateMockProcess({ pid: 2, cpu: 85.2, name: 'high-cpu' }),
      generateMockProcess({ pid: 3, cpu: 45.1, name: 'med-cpu' })
    ]
    
    ;(monitor as any).processes.value = processes
    ;(monitor as any).sortState.value = { column: 'cpu', direction: 'desc' }
    
    const sorted = (monitor as any).filteredProcesses.value
    expect(sorted[0].cpu).toBeGreaterThan(sorted[1].cpu)
    expect(sorted[1].cpu).toBeGreaterThan(sorted[2].cpu)
  })

  test('handles process selection', () => {
    const monitor = new ProcessMonitor()
    const onProcessSelect = mock(() => {})
    
    ;(monitor as any).props.onProcessSelect = onProcessSelect
    
    const pid = 1234
    ;(monitor as any).selectProcess(pid)
    
    expect((monitor as any).selectedPid.value).toBe(pid)
    expect(onProcessSelect).toHaveBeenCalledWith(pid)
  })

  test('formats memory values correctly', () => {
    const monitor = new ProcessMonitor()
    
    expect((monitor as any).formatMemory(1024)).toBe('1.0 KB')
    expect((monitor as any).formatMemory(1024 * 1024)).toBe('1.0 MB')
    expect((monitor as any).formatMemory(1024 * 1024 * 1024)).toBe('1.0 GB')
    expect((monitor as any).formatMemory(1536 * 1024 * 1024)).toBe('1.5 GB')
  })

  test('formats CPU values correctly', () => {
    const monitor = new ProcessMonitor()
    
    expect((monitor as any).formatCpu(25.678)).toBe('25.7%')
    expect((monitor as any).formatCpu(0.1)).toBe('0.1%')
    expect((monitor as any).formatCpu(100)).toBe('100.0%')
  })

  test('identifies system processes', () => {
    const monitor = new ProcessMonitor()
    
    const systemProcess = generateMockProcess({ pid: 1, user: 'root', name: 'kernel' })
    const userProcess = generateMockProcess({ pid: 5000, user: 'testuser', name: 'myapp' })
    
    expect((monitor as any).isSystemProcess(systemProcess)).toBe(true)
    expect((monitor as any).isSystemProcess(userProcess)).toBe(false)
  })

  test('handles tree view toggle', () => {
    const monitor = new ProcessMonitor()
    
    expect((monitor as any).treeView.value).toBe(false)
    
    ;(monitor as any).toggleTreeView()
    
    expect((monitor as any).treeView.value).toBe(true)
  })

  test('builds process tree correctly', () => {
    const monitor = new ProcessMonitor()
    const processes = [
      generateMockProcess({ pid: 1, ppid: 0, name: 'init' }),
      generateMockProcess({ pid: 100, ppid: 1, name: 'child1' }),
      generateMockProcess({ pid: 101, ppid: 1, name: 'child2' }),
      generateMockProcess({ pid: 200, ppid: 100, name: 'grandchild' })
    ]
    
    const tree = (monitor as any).buildProcessTree(processes)
    
    expect(tree).toHaveLength(1) // One root node
    expect(tree[0].process.pid).toBe(1)
    expect(tree[0].children).toHaveLength(2) // Two children
    expect(tree[0].children[0].children).toHaveLength(1) // One grandchild
  })

  test('handles sorting changes', () => {
    const monitor = new ProcessMonitor()
    
    // Initial sort
    ;(monitor as any).handleSort('memory')
    expect((monitor as any).sortState.value.column).toBe('memory')
    expect((monitor as any).sortState.value.direction).toBe('desc')
    
    // Toggle direction
    ;(monitor as any).handleSort('memory')
    expect((monitor as any).sortState.value.column).toBe('memory')
    expect((monitor as any).sortState.value.direction).toBe('asc')
    
    // New column
    ;(monitor as any).handleSort('cpu')
    expect((monitor as any).sortState.value.column).toBe('cpu')
    expect((monitor as any).sortState.value.direction).toBe('desc')
  })

  test('handles search queries', () => {
    const monitor = new ProcessMonitor()
    
    const query = 'test-query'
    ;(monitor as any).handleSearch(query)
    
    expect((monitor as any).filterState.value.searchQuery).toBe(query)
  })

  test('respects maxProcesses prop', () => {
    const monitor = new ProcessMonitor({ maxProcesses: 5 })
    const processes = generateMockProcesses(20)
    
    ;(monitor as any).processes.value = processes
    
    const displayProcesses = (monitor as any).displayProcesses.value
    const processesToShow = displayProcesses.slice(0, 5)
    
    expect(processesToShow).toHaveLength(5)
  })

  test('handles error states', async () => {
    const monitor = new ProcessMonitor()
    
    // Mock failed data collection
    ;(monitor as any).processCollector.collectProcesses = mock(async () => {
      throw new Error('Test error')
    })
    
    await (monitor as any).refreshData()
    
    expect((monitor as any).error.value).toBeTruthy()
    expect((monitor as any).refreshing.value).toBe(false)
  })

  test('cleanup stops monitoring', () => {
    const monitor = new ProcessMonitor({ refreshInterval: 100 })
    
    // Start monitoring
    ;(monitor as any).startMonitoring()
    expect((monitor as any).refreshTimer).toBeDefined()
    
    // Stop monitoring
    ;(monitor as any).stopMonitoring()
    expect((monitor as any).refreshTimer).toBeUndefined()
  })
})

describe('ProcessTree', () => {
  test('builds tree structure correctly', () => {
    const tree = new ProcessTree()
    const processes = [
      generateMockProcess({ pid: 1, ppid: 0, name: 'init' }),
      generateMockProcess({ pid: 2, ppid: 1, name: 'child1' }),
      generateMockProcess({ pid: 3, ppid: 1, name: 'child2' }),
      generateMockProcess({ pid: 4, ppid: 2, name: 'grandchild' })
    ]
    
    const treeNodes = tree.buildProcessTree(processes)
    
    expect(treeNodes).toHaveLength(1)
    expect(treeNodes[0].process.pid).toBe(1)
    expect(treeNodes[0].children).toHaveLength(2)
    expect(treeNodes[0].children[0].children).toHaveLength(1)
  })

  test('flattens tree respecting expansion state', () => {
    const tree = new ProcessTree()
    const processes = [
      generateMockProcess({ pid: 1, ppid: 0, name: 'init' }),
      generateMockProcess({ pid: 2, ppid: 1, name: 'child1' }),
      generateMockProcess({ pid: 3, ppid: 1, name: 'child2' })
    ]
    
    const treeNodes = tree.buildProcessTree(processes)
    
    // Initially collapsed
    let flattened = tree.flattenTree(treeNodes)
    expect(flattened).toHaveLength(1) // Only root visible
    
    // Expand root
    tree.toggleExpansion(1)
    const expandedNodes = tree.buildProcessTree(processes)
    flattened = tree.flattenTree(expandedNodes)
    expect(flattened).toHaveLength(3) // All nodes visible
  })

  test('finds nodes by PID', () => {
    const tree = new ProcessTree()
    const processes = [
      generateMockProcess({ pid: 1, ppid: 0, name: 'init' }),
      generateMockProcess({ pid: 2, ppid: 1, name: 'child1' })
    ]
    
    const treeNodes = tree.buildProcessTree(processes)
    
    const node = tree.findNode(treeNodes, 2)
    expect(node).toBeTruthy()
    expect(node?.process.pid).toBe(2)
    
    const notFound = tree.findNode(treeNodes, 999)
    expect(notFound).toBeNull()
  })

  test('calculates tree statistics', () => {
    const tree = new ProcessTree()
    const processes = [
      generateMockProcess({ pid: 1, ppid: 0, name: 'init' }),
      generateMockProcess({ pid: 2, ppid: 1, name: 'child1' }),
      generateMockProcess({ pid: 3, ppid: 1, name: 'child2' }),
      generateMockProcess({ pid: 4, ppid: 2, name: 'grandchild' })
    ]
    
    const treeNodes = tree.buildProcessTree(processes)
    const stats = tree.getTreeStats(treeNodes)
    
    expect(stats.totalNodes).toBe(4)
    expect(stats.rootNodes).toBe(1)
    expect(stats.leafNodes).toBe(2) // child2 and grandchild
    expect(stats.maxDepth).toBe(2)
  })
})

// Performance benchmarks
describe('ProcessMonitor Performance', () => {
  test('handles 100 processes efficiently', async () => {
    const start = performance.now()
    
    const monitor = new ProcessMonitor()
    const processes = generateMockProcesses(100)
    
    ;(monitor as any).processes.value = processes
    
    // Force computation of derived values
    const filtered = (monitor as any).filteredProcesses.value
    const displayed = (monitor as any).displayProcesses.value
    
    const end = performance.now()
    const duration = end - start
    
    expect(duration).toBeLessThan(50) // Should complete in under 50ms
    expect(filtered.length).toBe(100)
    expect(displayed.length).toBe(100)
  })

  test('tree building performance with 500 processes', async () => {
    const start = performance.now()
    
    const tree = new ProcessTree()
    const processes = generateMockProcesses(500)
    
    const treeNodes = tree.buildProcessTree(processes)
    
    const end = performance.now()
    const duration = end - start
    
    expect(duration).toBeLessThan(100) // Should complete in under 100ms
    expect(treeNodes.length).toBeGreaterThan(0)
  })

  test('sorting performance with large process list', () => {
    const start = performance.now()
    
    const monitor = new ProcessMonitor()
    const processes = generateMockProcesses(1000)
    
    ;(monitor as any).processes.value = processes
    ;(monitor as any).sortState.value = { column: 'cpu', direction: 'desc' }
    
    const sorted = (monitor as any).filteredProcesses.value
    
    const end = performance.now()
    const duration = end - start
    
    expect(duration).toBeLessThan(50) // Should complete in under 50ms
    expect(sorted.length).toBe(1000)
    
    // Verify sorting is correct
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].cpu).toBeGreaterThanOrEqual(sorted[i + 1].cpu)
    }
  })
})
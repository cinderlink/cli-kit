# Task 2C: ProcessMonitor Component - Detailed Subtask Specifications

## **📋 SUBTASK SPECIFICATIONS**

---

## **Subtask 2C.1: Core ProcessMonitor**

### **Objective**
Create the foundation ProcessMonitor component with real-time process data display and basic functionality.

### **Requirements**
```typescript
// Location: packages/components/src/system/process-monitor.tsx

export class ProcessMonitor extends ReactiveComponent {
  // Process data state
  private processes = $state([])
  private systemMetrics = $state({
    cpu: 0,
    memory: { used: 0, total: 0, percent: 0 },
    disk: { used: 0, total: 0, percent: 0 }
  })
  
  // UI state
  private sortState = $state({
    column: 'cpu',
    direction: 'desc'
  })
  
  private filterState = $state({
    searchQuery: '',
    minCpu: 0,
    minMemory: 0,
    selectedUsers: new Set()
  })
  
  // Filtered and sorted processes
  private displayProcesses = $derived(() => {
    let filtered = this.processes.value.filter(process => {
      // Apply search filter
      if (this.filterState.value.searchQuery) {
        const query = this.filterState.value.searchQuery.toLowerCase()
        if (!process.name.toLowerCase().includes(query) && 
            !process.command.toLowerCase().includes(query)) {
          return false
        }
      }
      
      // Apply resource filters
      if (process.cpu < this.filterState.value.minCpu) return false
      if (process.memory < this.filterState.value.minMemory) return false
      
      // Apply user filter
      if (this.filterState.value.selectedUsers.size > 0) {
        if (!this.filterState.value.selectedUsers.has(process.user)) return false
      }
      
      return true
    })
    
    // Apply sorting
    return filtered.sort((a, b) => {
      const column = this.sortState.value.column
      const direction = this.sortState.value.direction === 'asc' ? 1 : -1
      
      if (a[column] < b[column]) return -1 * direction
      if (a[column] > b[column]) return 1 * direction
      return 0
    })
  })
  
  // Real-time updates
  private $effect(() => {
    const interval = setInterval(() => {
      this.refreshProcesses()
      this.refreshSystemMetrics()
    }, this.props.refreshInterval || 1000)
    
    return () => clearInterval(interval)
  })
}
```

### **Implementation Steps**
1. Create base ProcessMonitor class extending ReactiveComponent
2. Implement process data collection from system APIs
3. Add real-time refresh with configurable intervals
4. Create sorting functionality for all columns
5. Implement filtering by name, user, and resource usage
6. Add system metrics collection and display
7. Test with various process loads

### **Testing Requirements**
- Handle 100+ processes without performance issues
- Verify real-time updates work correctly
- Test sorting accuracy and performance
- Verify filtering logic correctness
- Monitor memory usage during long runs

---

## **Subtask 2C.2: Process Tree Visualization**

### **Objective**
Add hierarchical process tree display showing parent-child relationships.

### **Requirements**
```typescript
// Location: packages/components/src/system/process-tree.tsx

interface ProcessTreeNode {
  process: ProcessInfo
  children: ProcessTreeNode[]
  parent?: ProcessTreeNode
  depth: number
  expanded: boolean
}

export class ProcessTree {
  // Tree state
  private treeNodes = $state([])
  private expandedNodes = $state(new Set<number>())
  
  buildProcessTree(processes: ProcessInfo[]): ProcessTreeNode[] {
    const processMap = new Map<number, ProcessTreeNode>()
    const rootNodes: ProcessTreeNode[] = []
    
    // Create nodes
    for (const process of processes) {
      processMap.set(process.pid, {
        process,
        children: [],
        depth: 0,
        expanded: this.expandedNodes.value.has(process.pid)
      })
    }
    
    // Build tree structure
    for (const node of processMap.values()) {
      if (node.process.ppid === 0 || !processMap.has(node.process.ppid)) {
        rootNodes.push(node)
      } else {
        const parent = processMap.get(node.process.ppid)!
        parent.children.push(node)
        node.parent = parent
        node.depth = parent.depth + 1
      }
    }
    
    return rootNodes
  }
  
  // Flatten tree for display
  private flattenTree(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
    const result: ProcessTreeNode[] = []
    
    function traverse(node: ProcessTreeNode) {
      result.push(node)
      if (node.expanded) {
        node.children.forEach(traverse)
      }
    }
    
    nodes.forEach(traverse)
    return result
  }
  
  toggleExpansion(pid: number) {
    const expanded = this.expandedNodes.value
    if (expanded.has(pid)) {
      expanded.delete(pid)
    } else {
      expanded.add(pid)
    }
    this.expandedNodes.value = new Set(expanded)
  }
}
```

### **Implementation Steps**
1. Design tree node data structure
2. Implement tree building algorithm from process list
3. Create tree flattening for display
4. Add expand/collapse functionality
5. Implement tree indentation rendering
6. Add parent-child relationship indicators
7. Test with complex process hierarchies

### **Performance Requirements**
- Build tree from 500 processes in <50ms
- Flatten tree for display in <20ms
- Expand/collapse operations instant
- Tree rendering maintains smooth scrolling

---

## **Subtask 2C.3: System Metrics Integration**

### **Objective**
Display comprehensive system metrics alongside process information.

### **Requirements**
```typescript
// Location: packages/components/src/system/metrics-collector.ts

export class SystemMetricsCollector {
  // Collect CPU usage
  async collectCpuMetrics(): Promise<CpuMetrics> {
    // Platform-specific CPU usage collection
    return {
      overall: await this.getOverallCpuUsage(),
      perCore: await this.getPerCoreCpuUsage(),
      loadAverage: await this.getLoadAverage()
    }
  }
  
  // Collect memory usage
  async collectMemoryMetrics(): Promise<MemoryMetrics> {
    return {
      total: await this.getTotalMemory(),
      used: await this.getUsedMemory(),
      available: await this.getAvailableMemory(),
      cached: await this.getCachedMemory(),
      buffers: await this.getBuffers()
    }
  }
  
  // Collect disk usage
  async collectDiskMetrics(): Promise<DiskMetrics> {
    return {
      filesystems: await this.getFilesystemUsage(),
      totalReads: await this.getDiskReads(),
      totalWrites: await this.getDiskWrites(),
      ioUtil: await this.getIoUtilization()
    }
  }
  
  // Collect network statistics
  async collectNetworkMetrics(): Promise<NetworkMetrics> {
    return {
      interfaces: await this.getNetworkInterfaces(),
      bytesReceived: await this.getBytesReceived(),
      bytesSent: await this.getBytesSent(),
      packetsReceived: await this.getPacketsReceived(),
      packetsSent: await this.getPacketsSent()
    }
  }
}

// Metrics display component
export class MetricsDisplay extends ReactiveComponent {
  private metrics = $state({
    cpu: null,
    memory: null,
    disk: null,
    network: null
  })
  
  // Historical data for graphs
  private history = $state({
    cpu: [],
    memory: [],
    timestamps: []
  })
  
  render() {
    return (
      <Box flexDirection="column">
        <Text>CPU: {this.metrics.value.cpu?.overall.toFixed(1)}%</Text>
        <Text>Memory: {this.formatBytes(this.metrics.value.memory?.used)} / {this.formatBytes(this.metrics.value.memory?.total)}</Text>
        <Text>Disk I/O: R:{this.formatBytes(this.metrics.value.disk?.totalReads)}/s W:{this.formatBytes(this.metrics.value.disk?.totalWrites)}/s</Text>
        {this.renderMetricGraphs()}
      </Box>
    )
  }
}
```

### **Implementation Steps**
1. Design metrics collection abstraction
2. Implement platform-specific metric gathering
3. Create metrics display components
4. Add historical data tracking
5. Implement metric graphs/charts
6. Add metric threshold alerts
7. Test on different operating systems

### **Testing Requirements**
- Accurate metric collection on macOS and Linux
- Metrics update smoothly without blocking UI
- Historical data doesn't cause memory leaks
- Graph rendering performs well

---

## **Subtask 2C.4: Interactive Features**

### **Objective**
Add comprehensive user interaction capabilities for process management.

### **Requirements**
```typescript
// Location: packages/components/src/system/process-actions.ts

export class ProcessActions {
  // Process management
  async killProcess(pid: number, signal: string = 'TERM'): Promise<Result<void, ProcessError>> {
    return Effect.tryPromise({
      try: () => this.sendSignal(pid, signal),
      catch: (error) => new ProcessError(`Failed to kill process ${pid}: ${error}`)
    })
  }
  
  async suspendProcess(pid: number): Promise<Result<void, ProcessError>> {
    return this.killProcess(pid, 'STOP')
  }
  
  async resumeProcess(pid: number): Promise<Result<void, ProcessError>> {
    return this.killProcess(pid, 'CONT')
  }
  
  // Process details
  async getProcessDetails(pid: number): Promise<DetailedProcessInfo> {
    return {
      ...await this.getBasicProcessInfo(pid),
      openFiles: await this.getOpenFiles(pid),
      networkConnections: await this.getNetworkConnections(pid),
      memoryMap: await this.getMemoryMap(pid),
      environment: await this.getEnvironment(pid)
    }
  }
}

// Interactive component
export class InteractiveProcessMonitor extends ProcessMonitor {
  private selectedProcess = $state(null)
  private actionInProgress = $state(false)
  
  // Keyboard navigation
  handleKeyPress(key: string) {
    switch (key) {
      case 'j':
      case 'ArrowDown':
        this.selectNext()
        break
      case 'k':
      case 'ArrowUp':
        this.selectPrevious()
        break
      case 'Enter':
        this.showProcessDetails()
        break
      case 'Delete':
      case 'd':
        this.confirmKillProcess()
        break
      case 's':
        this.suspendSelectedProcess()
        break
      case 'r':
        this.resumeSelectedProcess()
        break
    }
  }
  
  // Process management
  async killSelectedProcess() {
    if (!this.selectedProcess.value) return
    
    this.actionInProgress.value = true
    try {
      await this.processActions.killProcess(this.selectedProcess.value.pid)
      this.showNotification('Process killed successfully')
    } catch (error) {
      this.showError(`Failed to kill process: ${error.message}`)
    } finally {
      this.actionInProgress.value = false
    }
  }
}
```

### **Implementation Steps**
1. Implement process management actions (kill, suspend, resume)
2. Add keyboard navigation for process selection
3. Create process details modal/popup
4. Implement confirmation dialogs for destructive actions
5. Add error handling and user feedback
6. Create context menu for process actions
7. Test all interactive features thoroughly

### **Testing Requirements**
- All keyboard shortcuts work correctly
- Process actions execute safely with proper permissions
- Error handling provides meaningful feedback
- UI remains responsive during actions

---

## **Subtask 2C.5: ProcessMonitor Testing**

### **Objective**
Comprehensive testing suite ensuring reliability across different systems and loads.

### **Requirements**
```typescript
// Location: packages/components/src/system/__tests__/process-monitor.test.ts

describe('ProcessMonitor Component', () => {
  // Performance benchmarks
  bench('update 100 processes', () => {
    const processes = generateMockProcesses(100)
    const monitor = new ProcessMonitor({ refreshInterval: 1000 })
    monitor.updateProcesses(processes)
    expect(updateTime).toBeLessThan(50) // ms
  })
  
  // Tree building performance
  bench('build process tree with 500 processes', () => {
    const processes = generateMockProcessHierarchy(500)
    const tree = new ProcessTree()
    const treeNodes = tree.buildProcessTree(processes)
    expect(buildTime).toBeLessThan(100) // ms
  })
  
  // Sorting functionality
  test('sorts processes by CPU usage', () => {
    const processes = [
      { pid: 1, cpu: 10.5, name: 'process1' },
      { pid: 2, cpu: 5.2, name: 'process2' },
      { pid: 3, cpu: 15.8, name: 'process3' }
    ]
    const monitor = renderProcessMonitor({ processes })
    monitor.sortBy('cpu', 'desc')
    expect(monitor.displayProcesses[0].pid).toBe(3)
  })
  
  // Filtering functionality
  test('filters processes by search query', () => {
    const processes = [
      { pid: 1, name: 'chrome', command: '/usr/bin/chrome' },
      { pid: 2, name: 'firefox', command: '/usr/bin/firefox' },
      { pid: 3, name: 'safari', command: '/usr/bin/safari' }
    ]
    const monitor = renderProcessMonitor({ processes })
    monitor.setSearchQuery('chrome')
    expect(monitor.displayProcesses).toHaveLength(1)
    expect(monitor.displayProcesses[0].name).toBe('chrome')
  })
  
  // Real-time updates
  test('updates processes at specified interval', async () => {
    const monitor = renderProcessMonitor({ refreshInterval: 100 })
    const initialCount = monitor.processes.length
    await new Promise(resolve => setTimeout(resolve, 250))
    expect(monitor.refreshCount).toBeGreaterThan(2)
  })
  
  // Tree functionality
  test('builds correct process tree structure', () => {
    const processes = [
      { pid: 1, ppid: 0, name: 'init' },
      { pid: 2, ppid: 1, name: 'child1' },
      { pid: 3, ppid: 1, name: 'child2' },
      { pid: 4, ppid: 2, name: 'grandchild' }
    ]
    const tree = new ProcessTree()
    const treeNodes = tree.buildProcessTree(processes)
    expect(treeNodes).toHaveLength(1) // Only root node
    expect(treeNodes[0].children).toHaveLength(2) // Two children
    expect(treeNodes[0].children[0].children).toHaveLength(1) // One grandchild
  })
  
  // Process actions
  test('kills process with proper signal', async () => {
    const actions = new ProcessActions()
    const mockKill = jest.spyOn(actions, 'sendSignal')
    await actions.killProcess(1234, 'TERM')
    expect(mockKill).toHaveBeenCalledWith(1234, 'TERM')
  })
})
```

### **Implementation Steps**
1. Set up comprehensive test environment
2. Create mock process data generators
3. Test performance with various process counts
4. Add cross-platform compatibility tests
5. Test all user interactions
6. Create visual regression tests
7. Add system integration tests
8. Document testing procedures

### **Coverage Requirements**
- 90%+ code coverage
- All process management actions tested
- Performance benchmarks for key operations
- Cross-platform compatibility verified
- Memory usage monitored during testing

---

## **📝 INTEGRATION NOTES**

### **With Task 2A (DataTable)**
- Use similar sorting and filtering patterns
- Consistent keyboard navigation
- Share virtual scrolling approach for large process lists

### **With Task 2D (Process Manager Plugin)**
- ProcessMonitor displays data from Process Manager Plugin
- Support plugin-provided process metadata
- Handle plugin lifecycle events

### **Performance Considerations**
- Use efficient data structures for tree operations
- Implement incremental updates for large process lists
- Cache expensive system metric calculations
- Batch UI updates for smooth real-time display

---

## **🚀 DEVELOPMENT TIPS**

1. **Platform Abstraction**: Design clean abstractions for OS-specific APIs
2. **Performance First**: Set up benchmarks early and optimize iteratively
3. **Real Systems**: Test with actual system loads, not just mocks
4. **User Safety**: Be careful with process management actions
5. **Responsive UI**: Keep UI responsive during expensive operations
/**
 * Process Tree Utilities
 * 
 * Utilities for building and managing process tree structures for hierarchical
 * process display in the ProcessMonitor component.
 */

import type { ProcessInfo, ProcessTreeNode } from "./types"

/**
 * Process tree builder and manager
 */
export class ProcessTree {
  private expandedNodes = new Set<number>()
  
  /**
   * Build process tree from flat process list
   */
  buildProcessTree(processes: ProcessInfo[]): ProcessTreeNode[] {
    const processMap = new Map<number, ProcessTreeNode>()
    const rootNodes: ProcessTreeNode[] = []
    
    // Create nodes for all processes
    for (const process of processes) {
      processMap.set(process.pid, {
        process,
        children: [],
        depth: 0,
        expanded: this.expandedNodes.has(process.pid),
        selected: false
      })
    }
    
    // Build tree structure
    for (const node of processMap.values()) {
      if (node.process.ppid === 0 || !processMap.has(node.process.ppid)) {
        // Root process (no parent or parent not in list)
        rootNodes.push(node)
      } else {
        // Child process
        const parent = processMap.get(node.process.ppid)!
        parent.children.push(node)
        node.parent = parent
        node.depth = parent.depth + 1
      }
    }
    
    // Sort root nodes and their children
    this.sortTreeNodes(rootNodes)
    
    return rootNodes
  }
  
  /**
   * Recursively sort tree nodes
   */
  private sortTreeNodes(nodes: ProcessTreeNode[], sortBy: keyof ProcessInfo = 'cpu', direction: 'asc' | 'desc' = 'desc'): void {
    nodes.sort((a, b) => {
      const aValue = a.process[sortBy]
      const bValue = b.process[sortBy]
      const mult = direction === 'asc' ? 1 : -1
      
      if (aValue < bValue) return -1 * mult
      if (aValue > bValue) return 1 * mult
      return 0
    })
    
    // Sort children recursively
    nodes.forEach(node => {
      if (node.children.length > 0) {
        this.sortTreeNodes(node.children, sortBy, direction)
      }
    })
  }
  
  /**
   * Flatten tree for display, respecting expanded/collapsed state
   */
  flattenTree(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
    const result: ProcessTreeNode[] = []
    
    const traverse = (node: ProcessTreeNode) => {
      result.push(node)
      if (node.expanded && node.children.length > 0) {
        node.children.forEach(traverse)
      }
    }
    
    nodes.forEach(traverse)
    return result
  }
  
  /**
   * Toggle expansion state of a node
   */
  toggleExpansion(pid: number): void {
    if (this.expandedNodes.has(pid)) {
      this.expandedNodes.delete(pid)
    } else {
      this.expandedNodes.add(pid)
    }
  }
  
  /**
   * Expand all nodes
   */
  expandAll(nodes: ProcessTreeNode[]): void {
    const expandRecursive = (node: ProcessTreeNode) => {
      this.expandedNodes.add(node.process.pid)
      node.children.forEach(expandRecursive)
    }
    
    nodes.forEach(expandRecursive)
  }
  
  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    this.expandedNodes.clear()
  }
  
  /**
   * Find a node by PID in the tree
   */
  findNode(nodes: ProcessTreeNode[], pid: number): ProcessTreeNode | null {
    for (const node of nodes) {
      if (node.process.pid === pid) {
        return node
      }
      
      const found = this.findNode(node.children, pid)
      if (found) {
        return found
      }
    }
    
    return null
  }
  
  /**
   * Get path from root to a specific node
   */
  getNodePath(nodes: ProcessTreeNode[], pid: number): ProcessTreeNode[] {
    const path: ProcessTreeNode[] = []
    
    const findPath = (currentNodes: ProcessTreeNode[], targetPid: number): boolean => {
      for (const node of currentNodes) {
        path.push(node)
        
        if (node.process.pid === targetPid) {
          return true
        }
        
        if (this.findPath(node.children, targetPid)) {
          return true
        }
        
        path.pop()
      }
      
      return false
    }
    
    findPath(nodes, pid)
    return path
  }
  
  /**
   * Expand path to a specific node (useful for revealing a process)
   */
  expandPathTo(nodes: ProcessTreeNode[], pid: number): void {
    const path = this.getNodePath(nodes, pid)
    path.forEach(node => {
      this.expandedNodes.add(node.process.pid)
    })
  }
  
  /**
   * Get all descendant PIDs of a node
   */
  getDescendantPids(node: ProcessTreeNode): number[] {
    const pids: number[] = []
    
    const collectPids = (currentNode: ProcessTreeNode) => {
      pids.push(currentNode.process.pid)
      currentNode.children.forEach(collectPids)
    }
    
    node.children.forEach(collectPids)
    return pids
  }
  
  /**
   * Check if a node has any children
   */
  hasChildren(node: ProcessTreeNode): boolean {
    return node.children.length > 0
  }
  
  /**
   * Get tree statistics
   */
  getTreeStats(nodes: ProcessTreeNode[]): {
    totalNodes: number
    maxDepth: number
    rootNodes: number
    leafNodes: number
  } {
    let totalNodes = 0
    let maxDepth = 0
    let leafNodes = 0
    
    const traverse = (node: ProcessTreeNode) => {
      totalNodes++
      maxDepth = Math.max(maxDepth, node.depth)
      
      if (node.children.length === 0) {
        leafNodes++
      }
      
      node.children.forEach(traverse)
    }
    
    nodes.forEach(traverse)
    
    return {
      totalNodes,
      maxDepth,
      rootNodes: nodes.length,
      leafNodes
    }
  }
  
  /**
   * Filter tree nodes based on a predicate
   */
  filterTree(nodes: ProcessTreeNode[], predicate: (process: ProcessInfo) => boolean): ProcessTreeNode[] {
    const filteredNodes: ProcessTreeNode[] = []
    
    for (const node of nodes) {
      const filteredChildren = this.filterTree(node.children, predicate)
      
      // Include node if it matches predicate OR has matching children
      if (predicate(node.process) || filteredChildren.length > 0) {
        const newNode: ProcessTreeNode = {
          ...node,
          children: filteredChildren
        }
        filteredNodes.push(newNode)
      }
    }
    
    return filteredNodes
  }
  
  /**
   * Update selection state in tree
   */
  updateSelection(nodes: ProcessTreeNode[], selectedPid: number | null): ProcessTreeNode[] {
    return nodes.map(node => ({
      ...node,
      selected: node.process.pid === selectedPid,
      children: this.updateSelection(node.children, selectedPid)
    }))
  }
  
  /**
   * Get expanded node PIDs
   */
  getExpandedPids(): Set<number> {
    return new Set(this.expandedNodes)
  }
  
  /**
   * Set expanded node PIDs
   */
  setExpandedPids(pids: Set<number>): void {
    this.expandedNodes = new Set(pids)
  }
  
  /**
   * Generate tree visualization string (for debugging/logging)
   */
  generateTreeString(nodes: ProcessTreeNode[], maxNameLength = 20): string {
    const lines: string[] = []
    
    const traverse = (node: ProcessTreeNode, prefix = '', isLast = true) => {
      const connector = isLast ? '└── ' : '├── '
      const name = node.process.name.padEnd(maxNameLength).substring(0, maxNameLength)
      const info = `(PID: ${node.process.pid}, CPU: ${node.process.cpu.toFixed(1)}%)`
      
      lines.push(`${prefix}${connector}${name} ${info}`)
      
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      node.children.forEach((child, index) => {
        const childIsLast = index === node.children.length - 1
        traverse(child, childPrefix, childIsLast)
      })
    }
    
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1
      traverse(node, '', isLast)
    })
    
    return lines.join('\n')
  }
}
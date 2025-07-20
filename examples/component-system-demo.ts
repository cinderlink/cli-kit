#!/usr/bin/env bun
/**
 * Component System Demo
 * 
 * Demonstrates the reactive component system with:
 * - Event-driven UI updates using TUIX components
 * - Component coordination patterns
 * - Performance monitoring
 * - Lifecycle management
 * - Svelte 5 Runes for reactivity
 */

import { Effect } from 'effect'
import { bootstrapWithModules } from '../src/core/bootstrap'
import { createReactiveComponent, ReactiveComponentManager } from '../src/components/reactive/reactive-component'
import { $state, $derived, $effect } from '../src/reactivity/runes'
import type { View, Msg, Model } from '../src/core/types'
import type { UIComponent, CommonMessage } from '../src/tea/base'
import { generateComponentId } from '../src/tea/base'
import { style } from '../src/styling'
import { BaseEvent } from '../src/core/event-bus'

// Process info type for demo
interface ProcessInfo {
  id: string
  name: string
  pid: number
  status: 'running' | 'stopped' | 'error'
  cpu: number
  memory: number
}

// Process list component model and messages
interface ProcessListModel {
  processes: ProcessInfo[]
  selectedId: string | null
}

type ProcessListMsg = 
  | { type: 'SelectProcess'; id: string }
  | { type: 'ProcessesUpdated'; processes: ProcessInfo[] }

// Process list component
class ProcessListComponent implements UIComponent<ProcessListModel, ProcessListMsg> {
  readonly id = generateComponentId('process-list')
  
  init(): ProcessListModel {
    return {
      processes: [],
      selectedId: null
    }
  }
  
  update(msg: ProcessListMsg, model: ProcessListModel): [ProcessListModel, Effect.Effect<ProcessListMsg, never> | null] {
    switch (msg.type) {
      case 'SelectProcess':
        return [{ ...model, selectedId: msg.id }, null]
      case 'ProcessesUpdated':
        return [{ ...model, processes: msg.processes }, null]
      default:
        return [model, null]
    }
  }
  
  view(model: ProcessListModel): View {
    return {
      type: 'Box',
      props: {
        style: style().padding(1).border('single'),
        children: [
          {
            type: 'Text',
            props: {
              content: `Processes (${model.processes.length})`,
              style: style().bold().marginBottom(1)
            }
          },
          ...model.processes.map(process => ({
            type: 'Box',
            props: {
              style: style()
                .padding(0, 1)
                .background(model.selectedId === process.id ? '#333' : 'transparent')
                .cursor('pointer'),
              onClick: () => ({ type: 'SelectProcess', id: process.id }),
              children: [
                {
                  type: 'Text',
                  props: {
                    content: `${process.name} (PID: ${process.pid}) - ${process.status}`,
                    style: style().color(
                      process.status === 'running' ? 'green' :
                      process.status === 'error' ? 'red' : 'gray'
                    )
                  }
                },
                {
                  type: 'Text',
                  props: {
                    content: `CPU: ${process.cpu}% | Memory: ${process.memory}MB`,
                    style: style().fontSize(0.8).color('#666')
                  }
                }
              ]
            }
          }))
        ]
      }
    }
  }
}

// Create reactive version that responds to process events
function createReactiveProcessList(eventBus: any) {
  return createReactiveComponent(
    new ProcessListComponent(),
    ['process-events'],
    (event: BaseEvent) => Effect.sync(() => {
      if (event.type === 'processes-updated' && (event as any).processes) {
        return { type: 'ProcessesUpdated', processes: (event as any).processes } as ProcessListMsg
      }
      return null
    })
  )
}

// Demo runner
async function runDemo() {
  console.log('🎨 Component System Demo\n')

  // Bootstrap with component system
  const { modules, registry } = await Effect.runPromise(
    bootstrapWithModules({
      enableComponentSystem: true,
      enableCoordination: true
    })
  )

  const componentSystem = modules.componentSystem!
  const eventBus = (componentSystem as any).eventBus
  
  // Create reactive component manager
  const componentManager = new ReactiveComponentManager(eventBus)

  // Create and register reactive process list
  const processList = createReactiveProcessList(eventBus)
  await Effect.runPromise(
    componentManager.registerComponent(
      'process-list',
      processList,
      processList.init()
    )
  )

  console.log('✅ Reactive component registered\n')

  // Set up component coordination
  await Effect.runPromise(
    componentSystem.startComponentCoordination(
      'process-dashboard',
      'master-detail',
      ['process-list', 'process-details'],
      {
        masterId: 'process-list',
        detailId: 'process-details'
      }
    )
  )

  console.log('✅ Component coordination configured\n')

  // Simulate some processes
  const mockProcesses: ProcessInfo[] = [
    { id: 'p1', name: 'node', pid: 1234, status: 'running', cpu: 2.5, memory: 128 },
    { id: 'p2', name: 'chrome', pid: 5678, status: 'running', cpu: 15.2, memory: 512 },
    { id: 'p3', name: 'docker', pid: 9012, status: 'stopped', cpu: 0, memory: 0 },
    { id: 'p4', name: 'vscode', pid: 3456, status: 'running', cpu: 8.7, memory: 256 }
  ]

  // Emit process events
  await Effect.runPromise(
    eventBus.publish('process-events', {
      type: 'processes-updated',
      source: 'demo',
      timestamp: new Date(),
      id: 'demo-1',
      processes: mockProcesses
    })
  )

  console.log('📊 Simulated processes:', mockProcesses.length)

  // Use reactive state with runes
  const processCount = $state(mockProcesses.length)
  const runningCount = $derived(() => {
    const model = componentManager.getComponentModel<ProcessListModel>('process-list')
    if (!model) return 0
    return model().processes.filter(p => p.status === 'running').length
  })

  // Effect to log state changes
  $effect(() => {
    console.log(`\nActive processes: ${processCount()} (${runningCount()} running)`)
  })

  // Simulate process updates
  setInterval(async () => {
    const randomProcess = mockProcesses[Math.floor(Math.random() * mockProcesses.length)]
    randomProcess.cpu = Math.round(Math.random() * 20 * 10) / 10
    randomProcess.memory = Math.round((100 + Math.random() * 400))

    await Effect.runPromise(
      eventBus.publish('process-events', {
        type: 'processes-updated',
        source: 'demo',
        timestamp: new Date(),
        id: `demo-update-${Date.now()}`,
        processes: mockProcesses
      })
    )
    
    processCount.$set(mockProcesses.filter(p => p.status === 'running').length)
  }, 3000)

  // Get performance metrics periodically
  setInterval(async () => {
    const metrics = await Effect.runPromise(
      componentSystem.getSystemPerformanceMetrics()
    )
    
    console.log('\n⚡ Performance Metrics:', {
      activeComponents: metrics.activeComponents,
      totalRenders: metrics.renderingStats.totalRenders,
      cacheHitRate: (metrics.renderingStats.cacheHits / 
        (metrics.renderingStats.cacheHits + metrics.renderingStats.cacheMisses) || 0).toFixed(2),
      avgRenderTime: metrics.renderingStats.averageRenderTime.toFixed(2) + 'ms'
    })
  }, 10000)

  console.log('\n🚀 Component system is running!')
  console.log('Process updates are being simulated every 3 seconds.')
  console.log('Performance metrics are logged every 10 seconds.')
  
  // Keep process running
  await new Promise(() => {})
}

// Run the demo
runDemo().catch(console.error)
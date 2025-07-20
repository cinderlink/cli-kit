#!/usr/bin/env bun
/**
 * Coordination Module Demo
 * 
 * Demonstrates advanced cross-module coordination including:
 * - Event choreography
 * - Workflow orchestration
 * - Performance monitoring
 * - Error recovery
 * - Integration patterns
 */

import { Effect, Duration } from 'effect'
import { bootstrapWithModules } from '../src/core/bootstrap'
import type { WorkflowConfig } from '../src/core/coordination'

async function main() {
  console.log('🎭 Coordination Module Demo\n')
  
  // Bootstrap with all modules including coordination
  const { modules, registry } = await Effect.runPromise(
    bootstrapWithModules({
      enableLogging: true,
      enableProcessManager: true,
      enableStyling: true,
      enableCoordination: true,
      configPath: 'demo-config.json'
    })
  )
  
  const coordination = modules.coordination!
  
  // Configure coordination with all patterns enabled
  await Effect.runPromise(
    coordination.configureCoordination({
      enableProcessMonitoring: true,
      enableInteractiveCLI: true,
      enableDynamicUI: true,
      enableAuditTrail: true,
      performanceReportingInterval: Duration.seconds(10),
      errorRecoveryEnabled: true,
      streamOptimization: {
        processOutput: true,
        cliCommands: true,
        uiUpdates: true
      }
    })
  )
  
  console.log('✅ Coordination configured with all patterns\n')
  
  // Define a complex workflow
  const workflowConfig: WorkflowConfig = {
    name: 'Demo Workflow',
    description: 'Demonstrates cross-module coordination',
    requiredModules: ['cli', 'config', 'logger'],
    steps: [
      {
        id: 'load-config',
        type: 'config-update',
        description: 'Load initial configuration',
        config: {
          path: 'demo-config.json',
          section: 'app',
          value: { 
            version: '1.0.0',
            theme: 'dark',
            debug: true
          }
        }
      },
      {
        id: 'notify-ui',
        type: 'ui-update',
        description: 'Update UI with config',
        config: {
          type: 'config-loaded',
          payload: { message: 'Configuration loaded successfully' }
        },
        dependencies: ['load-config']
      },
      {
        id: 'log-completion',
        type: 'ui-update',
        description: 'Log workflow completion',
        config: {
          type: 'workflow-complete',
          payload: { workflowId: 'demo-workflow' }
        },
        dependencies: ['notify-ui']
      }
    ]
  }
  
  console.log('🚀 Starting coordinated workflow...\n')
  
  // Execute the workflow
  const result = await Effect.runPromise(
    coordination.startCoordinatedWorkflow('demo-workflow', workflowConfig)
  )
  
  console.log('✅ Workflow completed:', {
    status: result.status,
    duration: result.duration,
    steps: result.steps.map(s => ({
      id: s.id,
      status: s.status,
      duration: s.endTime && s.startTime 
        ? s.endTime.getTime() - s.startTime.getTime()
        : 0
    }))
  })
  
  // Get system health
  const health = await Effect.runPromise(coordination.getSystemHealth())
  
  console.log('\n📊 System Health:', {
    status: health.status,
    activePatterns: health.activePatterns,
    activeWorkflows: health.activeWorkflows,
    throughput: health.throughput.length + ' channels active',
    errors: health.errors.totalErrors + ' errors',
    errorRate: (health.errors.totalErrors / health.errors.totalEvents * 100).toFixed(2) + '%'
  })
  
  // Get performance metrics
  const metrics = await Effect.runPromise(coordination.getPerformanceMetrics())
  
  console.log('\n⚡ Performance Metrics:', {
    eventThroughput: metrics.eventThroughput.slice(0, 5).map(m => ({
      channel: m.channel,
      count: m.count,
      ratePerMinute: m.ratePerMinute.toFixed(2)
    })),
    memoryUsage: metrics.memoryUsage ? {
      heapUsed: (metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
    } : 'N/A'
  })
  
  // Simulate an error to test recovery
  console.log('\n🔥 Simulating error for recovery demo...')
  
  // Register a custom error pattern
  await Effect.runPromise(
    coordination.registerErrorPattern({
      id: 'demo-error',
      description: 'Demo error for testing',
      eventTypes: ['demo-error-event'],
      errorConditions: [{
        field: 'severity',
        operator: 'equals',
        value: 'high'
      }],
      recoveryStrategyId: 'cli-fallback'
    })
  )
  
  // Emit an error event
  const eventBus = (coordination as any).eventBus
  await Effect.runPromise(
    eventBus.publish('demo-channel', {
      type: 'demo-error-event',
      source: 'demo',
      timestamp: new Date(),
      id: 'demo-error-1',
      severity: 'high'
    })
  )
  
  // Wait for error processing
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Get error statistics
  const errorStats = await Effect.runPromise(coordination.getErrorStatistics())
  
  console.log('\n🛡️ Error Recovery Stats:', {
    totalErrors: errorStats.totalErrors,
    totalEvents: errorStats.totalEvents,
    recoverySuccessRate: (errorStats.recoverySuccessRate * 100).toFixed(2) + '%',
    errorsByType: errorStats.errorsByType
  })
  
  // Clean up
  console.log('\n🧹 Shutting down...')
  await Effect.runPromise(coordination.shutdown())
  
  console.log('\n✨ Demo complete!')
  process.exit(0)
}

// Run the demo
main().catch(console.error)
/* Created for compliance with CONVENTIONS.md. See docs for details. */
/**
 * Workflow Orchestration Tests
 *
 * Tests for workflow orchestration and step management
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { getGlobalEventBus, resetGlobalEventBus } from '@core/model/events/event-bus'
import { resetGlobalRegistry } from '@core/runtime/module/registry'
import { WorkflowOrchestrator } from './orchestrator'
import type { WorkflowConfig, WorkflowStep } from './types'

describe('Workflow Orchestration', () => {
  beforeEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  afterEach(async () => {
    await Effect.runPromise(resetGlobalRegistry())
    await Effect.runPromise(resetGlobalEventBus())
  })

  describe('Workflow Execution', () => {
    it('should execute a simple workflow', async () => {
      const eventBus = getGlobalEventBus()
      const orchestrator = new WorkflowOrchestrator(eventBus)

      // Define a simple workflow
      const workflowConfig: WorkflowConfig = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            handler: () => Effect.succeed({ success: true, data: 'step-1-result' }),
          } as WorkflowStep,
        ],
      }

      // Execute the workflow
      const result = await Effect.runPromise(
        orchestrator.executeWorkflow('test-workflow', workflowConfig)
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('step-1-result')
    })
  })

  describe('Workflow Cancellation', () => {
    it('should cancel a running workflow', async () => {
      const eventBus = getGlobalEventBus()
      const orchestrator = new WorkflowOrchestrator(eventBus)

      // Define a workflow with a long-running step
      const workflowConfig: WorkflowConfig = {
        id: 'long-workflow',
        name: 'Long Workflow',
        steps: [
          {
            id: 'slow-step',
            name: 'Slow Step',
            handler: () => Effect.sleep(5000).pipe(Effect.as({ success: true })),
          } as WorkflowStep,
        ],
      }

      // Start the workflow
      const execution = orchestrator.executeWorkflow('long-workflow', workflowConfig)

      // Cancel it quickly
      await Effect.runPromise(orchestrator.cancelWorkflow('long-workflow'))

      // Verify it was cancelled
      await expect(Effect.runPromise(execution)).rejects.toThrow()
    })
  })
})

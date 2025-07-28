import { test, expect, describe } from 'bun:test'
import { Effect } from 'effect'
import type { Component } from '../../core/types'
import {
  wrapWithDebug,
  initDebugModel,
  updateDebug,
  isDebugMsg,
  type DebugModel,
  type DebugMsg,
  type DebugWrappedModel,
  type DebugWrappedMsg,
} from './integration'

describe('Debug MVU Integration', () => {
  // Test app types
  type TestModel = { count: number }
  type TestMsg = { type: 'Increment' } | { type: 'Decrement' }

  // Test app component
  const testApp: Component<TestModel, TestMsg> = {
    init: Effect.succeed([{ count: 0 }, []]),
    update: (msg, model) =>
      Effect.succeed([
        msg.type === 'Increment' ? { count: model.count + 1 } : { count: model.count - 1 },
        [],
      ]),
    view: model => ({ render: () => Effect.succeed(`Count: ${model.count}`) }),
  }

  describe('initDebugModel', () => {
    test('creates initial debug state', () => {
      const model = initDebugModel()
      expect(model.activeTab).toBe('app')
      expect(model.logs).toEqual([])
      expect(model.output).toEqual([])
      expect(model.events).toEqual([])
      expect(model.isVisible).toBe(true)
      expect(model.performance.renderCount).toBe(0)
    })
  })

  describe('updateDebug', () => {
    test('switches tabs', () => {
      const model = initDebugModel()
      const [newModel] = updateDebug({ type: 'SwitchTab', tab: 'logs' }, model)
      expect(newModel.activeTab).toBe('logs')
    })

    test('toggles visibility', () => {
      const model = initDebugModel()
      const [newModel] = updateDebug({ type: 'ToggleVisibility' }, model)
      expect(newModel.isVisible).toBe(false)
    })

    test('adds logs with limit', () => {
      let model = initDebugModel()

      // Add 105 logs
      for (let i = 0; i < 105; i++) {
        const [newModel] = updateDebug({ type: 'AddLog', message: `Log ${i}` }, model)
        model = newModel
      }

      // Should only keep last 100
      expect(model.logs.length).toBe(100)
      expect(model.logs[0]).toBe('Log 5')
      expect(model.logs[99]).toBe('Log 104')
    })

    test('records events', () => {
      const model = initDebugModel()
      const [newModel] = updateDebug(
        {
          type: 'RecordEvent',
          event: 'test-event',
          data: { foo: 'bar' },
        },
        model
      )

      expect(newModel.events.length).toBe(1)
      expect(newModel.events[0].type).toBe('test-event')
      expect(newModel.events[0].data).toEqual({ foo: 'bar' })
      expect(newModel.events[0].timestamp).toBeGreaterThan(0)
    })

    test('updates performance metrics', () => {
      let model = initDebugModel()

      // Add some render times
      const [model1] = updateDebug({ type: 'UpdatePerformance', renderTime: 10 }, model)
      const [model2] = updateDebug({ type: 'UpdatePerformance', renderTime: 20 }, model1)
      const [model3] = updateDebug({ type: 'UpdatePerformance', renderTime: 30 }, model2)

      expect(model3.performance.renderCount).toBe(3)
      expect(model3.performance.lastRenderTime).toBe(30)
      expect(model3.performance.avgRenderTime).toBe(20) // (10 + 20 + 30) / 3
    })
  })

  describe('isDebugMsg', () => {
    test('identifies debug messages', () => {
      const debugMsg: DebugWrappedMsg<TestMsg> = {
        type: 'Debug',
        msg: { type: 'SwitchTab', tab: 'logs' },
      }
      expect(isDebugMsg(debugMsg)).toBe(true)
    })

    test('identifies app messages', () => {
      const appMsg: DebugWrappedMsg<TestMsg> = {
        type: 'App',
        msg: { type: 'Increment' },
      }
      expect(isDebugMsg(appMsg)).toBe(false)
    })
  })

  describe('wrapWithDebug', () => {
    test('wraps init to include debug model', async () => {
      const wrapped = wrapWithDebug(testApp)
      const result = await Effect.runPromise(wrapped.init)
      const [model, cmds] = result

      expect(model.app).toEqual({ count: 0 })
      expect(model.debug).toEqual(initDebugModel())
      expect(cmds).toEqual([])
    })

    test('handles app messages', async () => {
      const wrapped = wrapWithDebug(testApp)
      const [initModel] = await Effect.runPromise(wrapped.init)

      const appMsg: DebugWrappedMsg<TestMsg> = {
        type: 'App',
        msg: { type: 'Increment' },
      }

      const [newModel, cmds] = await Effect.runPromise(wrapped.update(appMsg, initModel))

      expect(newModel.app.count).toBe(1)
      expect(newModel.debug).toEqual(initModel.debug)

      // Should have performance tracking command
      expect(cmds.length).toBeGreaterThan(0)
    })

    test('handles debug messages', async () => {
      const wrapped = wrapWithDebug(testApp)
      const [initModel] = await Effect.runPromise(wrapped.init)

      const debugMsg: DebugWrappedMsg<TestMsg> = {
        type: 'Debug',
        msg: { type: 'SwitchTab', tab: 'logs' },
      }

      const [newModel] = await Effect.runPromise(wrapped.update(debugMsg, initModel))

      expect(newModel.app).toEqual(initModel.app)
      expect(newModel.debug.activeTab).toBe('logs')
    })

    test('wraps view when debug is visible', () => {
      const wrapped = wrapWithDebug(testApp)
      const model: DebugWrappedModel<TestModel> = {
        app: { count: 5 },
        debug: { ...initDebugModel(), isVisible: true },
      }

      const view = wrapped.view(model)
      expect(view).toBeDefined()
      expect(view.render).toBeDefined()
    })

    test('returns app view when debug is hidden', () => {
      const wrapped = wrapWithDebug(testApp)
      const model: DebugWrappedModel<TestModel> = {
        app: { count: 5 },
        debug: { ...initDebugModel(), isVisible: false },
      }

      const view = wrapped.view(model)
      expect(view).toBeDefined()
      expect(view.render).toBeDefined()
    })
  })
})

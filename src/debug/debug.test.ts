import { test, expect, describe } from 'bun:test'
import { debugStore, debug } from './core/store'

describe('Debug Module', () => {
  describe('debugStore', () => {
    test('should initialize with empty state', () => {
      const state = debugStore.getState()
      expect(state.events).toEqual([])
      expect(state.performanceMetrics.size).toBe(0)
      expect(state.paused).toBe(false)
    })

    test('should log events', () => {
      debugStore.clear()
      debug.system('Test system event')

      const state = debugStore.getState()
      expect(state.events.length).toBe(2) // includes "Debug events cleared" message
      expect(state.events[1].category).toBe('system')
      expect(state.events[1].message).toBe('Test system event')
    })

    test('should track performance metrics', () => {
      debugStore.clear()
      debug.performance('Test operation', 123.45)

      const state = debugStore.getState()
      expect(state.performanceMetrics.size).toBe(1)
      expect(state.performanceMetrics.get('Test operation')?.name).toBe('Test operation')
      expect(state.performanceMetrics.get('Test operation')?.totalTime).toBe(123.45)
    })

    test('should filter events', () => {
      debugStore.clear()
      debug.system('System event')
      debug.render('Render event')
      debug.match('Match event', { data: 'test' })

      debugStore.setFilter('render')
      const filtered = debugStore.getFilteredEvents()
      expect(filtered.length).toBe(1)
      expect(filtered[0].category).toBe('render')
    })

    test('should pause/resume logging', () => {
      debugStore.clear()
      const eventsAfterClear = debugStore.getState().events.length // 1 for "Debug events cleared"
      debugStore.setPaused(true)
      const eventsAfterPause = debugStore.getState().events.length // +1 for "Debug recording paused"

      debug.render('Should not be logged') // non-system events should be ignored when paused
      expect(debugStore.getState().events.length).toBe(eventsAfterPause)

      debugStore.setPaused(false)
      const eventsAfterResume = debugStore.getState().events.length // +1 for "Debug recording resumed"
      debug.render('Should be logged')
      expect(debugStore.getState().events.length).toBe(eventsAfterResume + 1)
    })
  })
})

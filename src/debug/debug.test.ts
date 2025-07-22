import { test, expect, describe } from 'bun:test'
import { debugStore, debug } from './core/store'

describe('Debug Module', () => {
  describe('debugStore', () => {
    test('should initialize with empty state', () => {
      const state = debugStore.getState()
      expect(state.events).toEqual([])
      expect(state.performance).toEqual([])
      expect(state.isPaused).toBe(false)
    })
    
    test('should log events', () => {
      debugStore.clear()
      debug.system('Test system event')
      
      const state = debugStore.getState()
      expect(state.events.length).toBe(1)
      expect(state.events[0].category).toBe('system')
      expect(state.events[0].message).toBe('Test system event')
    })
    
    test('should track performance metrics', () => {
      debugStore.clear()
      debug.performance('Test operation', 123.45)
      
      const state = debugStore.getState()
      expect(state.performance.length).toBe(1)
      expect(state.performance[0].name).toBe('Test operation')
      expect(state.performance[0].duration).toBe(123.45)
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
      debugStore.setPaused(true)
      
      debug.system('Should not be logged')
      expect(debugStore.getState().events.length).toBe(0)
      
      debugStore.setPaused(false)
      debug.system('Should be logged')
      expect(debugStore.getState().events.length).toBe(1)
    })
  })
})
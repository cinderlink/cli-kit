/**
 * Dependency Manager Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { DependencyManager } from './dependencyManager'
import { PluginStore } from './pluginStore'
import type { Plugin } from '../plugin'

describe('DependencyManager', () => {
  let store: PluginStore
  let manager: DependencyManager

  const createPlugin = (name: string, deps: Record<string, string> = {}): Plugin => ({
    metadata: {
      name,
      version: '1.0.0',
      dependencies: deps,
    },
  })

  beforeEach(() => {
    store = new PluginStore()
    manager = new DependencyManager(store)
  })

  describe('validateDependencies', () => {
    it('should validate plugin with no dependencies', () => {
      const plugin = createPlugin('plugin-a')
      store.add(plugin)
      manager.updateGraph('plugin-a')

      const validation = manager.validateDependencies('plugin-a')
      expect(validation.valid).toBe(true)
      expect(validation.missing).toEqual([])
      expect(validation.circular).toEqual([])
    })

    it('should detect missing dependencies', () => {
      const plugin = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      store.add(plugin)
      manager.updateGraph('plugin-a')

      const validation = manager.validateDependencies('plugin-a')
      expect(validation.valid).toBe(false)
      expect(validation.missing).toEqual(['plugin-b'])
    })

    it('should validate satisfied dependencies', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b')

      store.add(pluginB)
      store.add(pluginA)
      manager.updateGraph('plugin-b')
      manager.updateGraph('plugin-a')

      const validation = manager.validateDependencies('plugin-a')
      expect(validation.valid).toBe(true)
      expect(validation.missing).toEqual([])
    })

    it('should return invalid for non-existent plugin', () => {
      const validation = manager.validateDependencies('non-existent')
      expect(validation.valid).toBe(false)
      expect(validation.missing).toEqual(['non-existent'])
    })
  })

  describe('circular dependencies', () => {
    it('should detect direct circular dependency', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b', { 'plugin-a': '1.0.0' })

      store.add(pluginA)
      store.add(pluginB)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')

      const validation = manager.validateDependencies('plugin-a')
      expect(validation.valid).toBe(false)
      expect(validation.circular).toContain('plugin-a')
      expect(validation.circular).toContain('plugin-b')
    })

    it('should detect indirect circular dependency', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b', { 'plugin-c': '1.0.0' })
      const pluginC = createPlugin('plugin-c', { 'plugin-a': '1.0.0' })

      store.add(pluginA)
      store.add(pluginB)
      store.add(pluginC)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')
      manager.updateGraph('plugin-c')

      const validation = manager.validateDependencies('plugin-a')
      expect(validation.valid).toBe(false)
      expect(validation.circular.length).toBeGreaterThan(0)
    })
  })

  describe('updateGraph', () => {
    it('should update dependency graph', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b')

      store.add(pluginA)
      store.add(pluginB)

      manager.updateGraph('plugin-a')

      // Plugin B should have A as a dependent
      const pluginBRegistered = store.get('plugin-b')
      expect(pluginBRegistered?.dependents).toContain('plugin-a')
    })

    it('should handle non-existent plugin gracefully', () => {
      expect(() => manager.updateGraph('non-existent')).not.toThrow()
    })
  })

  describe('removeFromGraph', () => {
    it('should remove plugin from graph', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b')

      store.add(pluginA)
      store.add(pluginB)
      manager.updateGraph('plugin-a')

      // Verify dependent was added
      expect(store.get('plugin-b')?.dependents).toContain('plugin-a')

      // Remove from graph
      manager.removeFromGraph('plugin-a')

      // Verify dependent was removed
      expect(store.get('plugin-b')?.dependents).toEqual([])
    })
  })

  describe('getDependencyOrder', () => {
    it('should return topologically sorted order', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0', 'plugin-c': '1.0.0' })
      const pluginB = createPlugin('plugin-b', { 'plugin-c': '1.0.0' })
      const pluginC = createPlugin('plugin-c')

      store.add(pluginA)
      store.add(pluginB)
      store.add(pluginC)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')
      manager.updateGraph('plugin-c')

      const order = manager.getDependencyOrder()

      // C should come before B, B before A
      const indexA = order.indexOf('plugin-a')
      const indexB = order.indexOf('plugin-b')
      const indexC = order.indexOf('plugin-c')

      expect(indexC).toBeLessThan(indexB)
      expect(indexB).toBeLessThan(indexA)
    })

    it('should handle independent plugins', () => {
      const pluginA = createPlugin('plugin-a')
      const pluginB = createPlugin('plugin-b')

      store.add(pluginA)
      store.add(pluginB)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')

      const order = manager.getDependencyOrder()
      expect(order).toContain('plugin-a')
      expect(order).toContain('plugin-b')
    })
  })

  describe('canEnable', () => {
    it('should allow enabling plugin with satisfied dependencies', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      const pluginB = createPlugin('plugin-b')

      store.add(pluginB)
      store.add(pluginA)
      manager.updateGraph('plugin-b')
      manager.updateGraph('plugin-a')

      const result = manager.canEnable('plugin-a')
      expect(result.canEnable).toBe(true)
      expect(result.reasons).toEqual([])
    })

    it('should prevent enabling with missing dependencies', () => {
      const pluginA = createPlugin('plugin-a', { 'plugin-b': '1.0.0' })
      store.add(pluginA)
      manager.updateGraph('plugin-a')

      const result = manager.canEnable('plugin-a')
      expect(result.canEnable).toBe(false)
      expect(result.reasons[0]).toContain('Missing dependencies: plugin-b')
    })
  })

  describe('canDisable', () => {
    it('should allow disabling plugin with no active dependents', () => {
      const pluginA = createPlugin('plugin-a')
      store.add(pluginA)

      const result = manager.canDisable('plugin-a')
      expect(result.canDisable).toBe(true)
      expect(result.affectedPlugins).toEqual([])
    })

    it('should prevent disabling plugin with active dependents', () => {
      const pluginA = createPlugin('plugin-a')
      const pluginB = createPlugin('plugin-b', { 'plugin-a': '1.0.0' })

      store.add(pluginA)
      store.add(pluginB)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')

      const result = manager.canDisable('plugin-a')
      expect(result.canDisable).toBe(false)
      expect(result.affectedPlugins).toEqual(['plugin-b'])
    })

    it('should allow disabling if dependents are disabled', () => {
      const pluginA = createPlugin('plugin-a')
      const pluginB = createPlugin('plugin-b', { 'plugin-a': '1.0.0' })

      store.add(pluginA)
      store.add(pluginB)
      manager.updateGraph('plugin-a')
      manager.updateGraph('plugin-b')

      // Disable dependent
      store.setEnabled('plugin-b', false)

      const result = manager.canDisable('plugin-a')
      expect(result.canDisable).toBe(true)
      expect(result.affectedPlugins).toEqual([])
    })
  })
})

/**
 * Scope Manager Tests
 * 
 * Comprehensive tests for the scope management system including:
 * - Scope registration and removal
 * - Scope hierarchy and parent-child relationships
 * - Scope activation and deactivation
 * - Path-based scope matching
 */

import { test, expect, describe, beforeEach } from 'bun:test'
import { Effect } from 'effect'
import { ScopeManager } from './manager'
import type { ScopeDef } from './types'

describe('ScopeManager', () => {
  let scopeManager: ScopeManager

  beforeEach(() => {
    scopeManager = new ScopeManager()
  })

  describe('Scope Registration', () => {
    test('should register a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'test-scope',
        path: ['app', 'test'],
        type: 'component',
        name: 'Test Scope',
        metadata: { test: true }
      }

      await Effect.runPromise(
        scopeManager.registerScope(scopeDef)
      )
      
      // Verify scope was registered
      const registeredDef = scopeManager.getScopeDef('test-scope')
      expect(registeredDef).toBeDefined()
      expect(registeredDef?.id).toBe('test-scope')
      expect(registeredDef?.name).toBe('Test Scope')
    })

    test('should prevent conflicting scope registration', async () => {
      const scopeDef1: ScopeDef = {
        id: 'conflict-scope',
        path: ['app'],
        type: 'component',
        name: 'Original Scope'
      }

      const scopeDef2: ScopeDef = {
        id: 'conflict-scope', // Same ID
        path: ['app'],
        type: 'command', // Different type
        name: 'Conflicting Scope'
      }

      // First registration should succeed
      await Effect.runPromise(scopeManager.registerScope(scopeDef1))

      // Second registration with different properties should fail
      const result = await Effect.runPromise(
        Effect.either(scopeManager.registerScope(scopeDef2))
      )
      
      expect(result._tag).toBe('Left')
    })

    test('should register child scope with parent', async () => {
      const parentDef: ScopeDef = {
        id: 'parent',
        path: ['app'],
        type: 'component',
        name: 'Parent'
      }

      const childDef: ScopeDef = {
        id: 'child',
        path: ['app', 'child'],
        type: 'component',
        name: 'Child'
      }

      await Effect.runPromise(scopeManager.registerScope(parentDef))
      await Effect.runPromise(scopeManager.registerScope(childDef))

      // Verify parent-child relationship
      const childScopes = scopeManager.getChildScopes('parent')
      expect(childScopes).toHaveLength(1)
      expect(childScopes[0].id).toBe('child')
      
      const parentScope = scopeManager.getParentScope('child')
      expect(parentScope?.id).toBe('parent')
    })
  })

  describe('Scope Removal', () => {
    test('should remove a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'removable',
        path: ['app'],
        type: 'component',
        name: 'Removable'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))

      // Verify registered
      expect(scopeManager.getScopeDef('removable')).toBeDefined()

      // Remove scope
      await Effect.runPromise(scopeManager.removeScope('removable'))

      // Verify removed
      expect(scopeManager.getScopeDef('removable')).toBeNull()
    })

    test('should reparent children when removing parent', async () => {
      const grandparentDef: ScopeDef = {
        id: 'grandparent',
        path: ['app'],
        type: 'component',
        name: 'Grandparent'
      }

      const parentDef: ScopeDef = {
        id: 'parent',
        path: ['app', 'parent'],
        type: 'component',
        name: 'Parent'
      }

      const childDef: ScopeDef = {
        id: 'child',
        path: ['app', 'parent', 'child'],
        type: 'component',
        name: 'Child'
      }

      await Effect.runPromise(scopeManager.registerScope(grandparentDef))
      await Effect.runPromise(scopeManager.registerScope(parentDef))
      await Effect.runPromise(scopeManager.registerScope(childDef))

      // Remove parent
      await Effect.runPromise(scopeManager.removeScope('parent'))

      // Child should be reparented to grandparent
      const parentScope = scopeManager.getParentScope('child')
      expect(parentScope?.id).toBe('grandparent')
    })
  })

  describe('Scope Activation', () => {
    test('should activate a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'activatable',
        path: ['app'],
        type: 'component',
        name: 'Activatable'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.activateScope('activatable'))

      expect(scopeManager.isScopeActive('activatable')).toBe(true)
    })

    test('should handle activation of non-existent scope', async () => {
      const result = await Effect.runPromise(
        Effect.either(scopeManager.activateScope('non-existent'))
      )
      
      expect(result._tag).toBe('Left')
    })
  })

  describe('Scope Status Management', () => {
    test('should set and get scope status', async () => {
      const scopeDef: ScopeDef = {
        id: 'status-scope',
        path: ['app'],
        type: 'component',
        name: 'Status Scope'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.setScopeStatus('status-scope', 'mounted'))

      const status = scopeManager.getScopeStatus('status-scope')
      expect(status).toBe('mounted')
    })

    test('should return null for non-existent scope status', () => {
      const status = scopeManager.getScopeStatus('non-existent')
      expect(status).toBeNull()
    })
  })

  describe('Scope Context', () => {
    test('should set and get scope context', async () => {
      const scopeDef: ScopeDef = {
        id: 'context-scope',
        path: ['app'],
        type: 'component',
        name: 'Context Scope'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      
      const contextData = { userId: '123', theme: 'dark' }
      await Effect.runPromise(scopeManager.setScopeContext('context-scope', contextData))

      const retrievedContext = scopeManager.getScopeContext('context-scope')
      expect(retrievedContext).toEqual(contextData)
    })
  })

  describe('Scope Cleanup', () => {
    test('should clear all scopes', async () => {
      const scopeDef: ScopeDef = {
        id: 'clearable',
        path: ['app'],
        type: 'component',
        name: 'Clearable'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      expect(scopeManager.getAllScopes()).toHaveLength(1)

      scopeManager.clear()
      expect(scopeManager.getAllScopes()).toHaveLength(0)
    })
  })
})
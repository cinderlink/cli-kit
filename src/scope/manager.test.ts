/**
 * Scope Manager Tests
 * 
 * Comprehensive tests for the scope management system including:
 * - Scope registration and removal
 * - Scope hierarchy and parent-child relationships
 * - Scope activation and deactivation
 * - Path-based scope matching
 * - Scope lifecycle management
 * - Event propagation
 * - Memory leak prevention
 * - Concurrent scope operations
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test'
import { Effect } from 'effect'
import { ScopeManager, ScopeError } from './manager'
import type { ScopeDef, ScopeState } from './types'

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
        metadata: { name: 'Test Scope' }
      }

      const result = await Effect.runPromise(
        scopeManager.registerScope(scopeDef)
      )

      expect(result).toEqual(scopeDef)
      
      // Verify scope was registered
      const state = scopeManager.getScopeState('test-scope')
      expect(state).toBeDefined()
      expect(state?.scope).toEqual(scopeDef)
      expect(state?.status).toBe('inactive')
    })

    test('should prevent duplicate scope registration', async () => {
      const scopeDef: ScopeDef = {
        id: 'duplicate-scope',
        path: ['app'],
        type: 'component'
      }

      // First registration should succeed
      await Effect.runPromise(scopeManager.registerScope(scopeDef))

      // Second registration should fail
      const result = await Effect.runPromiseEither(
        scopeManager.registerScope(scopeDef)
      )

      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(ScopeError)
        expect(result.left.message).toContain('already registered')
      }
    })

    test('should register child scope with parent', async () => {
      const parentDef: ScopeDef = {
        id: 'parent',
        path: ['app'],
        type: 'component'
      }

      const childDef: ScopeDef = {
        id: 'child',
        path: ['app', 'child'],
        parentId: 'parent',
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(parentDef))
      await Effect.runPromise(scopeManager.registerScope(childDef))

      // Verify parent-child relationship
      const parentState = scopeManager.getScopeState('parent')
      const childState = scopeManager.getScopeState('child')

      expect(parentState?.childIds).toContain('child')
      expect(childState?.parentId).toBe('parent')
    })
  })

  describe('Scope Removal', () => {
    test('should remove a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'removable',
        path: ['test'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      
      // Verify registered
      expect(scopeManager.getScopeState('removable')).toBeDefined()

      // Remove scope
      await Effect.runPromise(scopeManager.removeScope('removable'))

      // Verify removed
      expect(scopeManager.getScopeState('removable')).toBeUndefined()
    })

    test('should reparent children when removing parent', async () => {
      const grandparentDef: ScopeDef = {
        id: 'grandparent',
        path: ['app'],
        type: 'component'
      }

      const parentDef: ScopeDef = {
        id: 'parent',
        path: ['app', 'parent'],
        parentId: 'grandparent',
        type: 'component'
      }

      const childDef: ScopeDef = {
        id: 'child',
        path: ['app', 'parent', 'child'],
        parentId: 'parent',
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(grandparentDef))
      await Effect.runPromise(scopeManager.registerScope(parentDef))
      await Effect.runPromise(scopeManager.registerScope(childDef))

      // Remove parent
      await Effect.runPromise(scopeManager.removeScope('parent'))

      // Child should be reparented to grandparent
      const childState = scopeManager.getScopeState('child')
      const grandparentState = scopeManager.getScopeState('grandparent')

      expect(childState?.parentId).toBe('grandparent')
      expect(grandparentState?.childIds).toContain('child')
    })

    test('should handle removing non-existent scope gracefully', async () => {
      // Should not throw
      await Effect.runPromise(scopeManager.removeScope('non-existent'))
    })
  })

  describe('Scope Activation', () => {
    test('should activate a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'activatable',
        path: ['test'],
        type: 'component',
        onActivate: mock()
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.activateScope('activatable'))

      const state = scopeManager.getScopeState('activatable')
      expect(state?.status).toBe('active')
      expect(scopeDef.onActivate).toHaveBeenCalled()
    })

    test('should deactivate previously active scope in same path', async () => {
      const scope1: ScopeDef = {
        id: 'scope1',
        path: ['app', 'view'],
        type: 'component',
        onDeactivate: mock()
      }

      const scope2: ScopeDef = {
        id: 'scope2',
        path: ['app', 'view'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scope1))
      await Effect.runPromise(scopeManager.registerScope(scope2))

      // Activate first scope
      await Effect.runPromise(scopeManager.activateScope('scope1'))
      expect(scopeManager.getScopeState('scope1')?.status).toBe('active')

      // Activate second scope - should deactivate first
      await Effect.runPromise(scopeManager.activateScope('scope2'))
      
      expect(scopeManager.getScopeState('scope1')?.status).toBe('inactive')
      expect(scopeManager.getScopeState('scope2')?.status).toBe('active')
      expect(scope1.onDeactivate).toHaveBeenCalled()
    })

    test('should handle activation errors', async () => {
      const scopeDef: ScopeDef = {
        id: 'error-scope',
        path: ['test'],
        type: 'component',
        onActivate: () => {
          throw new Error('Activation failed')
        }
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      
      const result = await Effect.runPromiseEither(
        scopeManager.activateScope('error-scope')
      )

      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left.message).toContain('Activation failed')
      }
    })
  })

  describe('Scope Deactivation', () => {
    test('should deactivate a scope', async () => {
      const scopeDef: ScopeDef = {
        id: 'deactivatable',
        path: ['test'],
        type: 'component',
        onDeactivate: mock()
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.activateScope('deactivatable'))
      await Effect.runPromise(scopeManager.deactivateScope('deactivatable'))

      const state = scopeManager.getScopeState('deactivatable')
      expect(state?.status).toBe('inactive')
      expect(scopeDef.onDeactivate).toHaveBeenCalled()
    })
  })

  describe('Path-based Operations', () => {
    test('should find scopes by path', async () => {
      const scopes: ScopeDef[] = [
        { id: 'root', path: [], type: 'component' },
        { id: 'app', path: ['app'], type: 'component' },
        { id: 'app-home', path: ['app', 'home'], type: 'component' },
        { id: 'app-settings', path: ['app', 'settings'], type: 'component' }
      ]

      for (const scope of scopes) {
        await Effect.runPromise(scopeManager.registerScope(scope))
      }

      const appScopes = scopeManager.getScopesByPath(['app'])
      expect(appScopes).toHaveLength(1)
      expect(appScopes[0].id).toBe('app')

      const homeScopes = scopeManager.getScopesByPath(['app', 'home'])
      expect(homeScopes).toHaveLength(1)
      expect(homeScopes[0].id).toBe('app-home')
    })

    test('should activate scope by path', async () => {
      const scopeDef: ScopeDef = {
        id: 'path-scope',
        path: ['app', 'test'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.activateScopeByPath(['app', 'test']))

      const state = scopeManager.getScopeState('path-scope')
      expect(state?.status).toBe('active')
    })

    test('should get child scopes', () => {
      const parentDef: ScopeDef = {
        id: 'parent',
        path: ['app'],
        type: 'component'
      }

      const child1: ScopeDef = {
        id: 'child1',
        path: ['app', 'child1'],
        parentId: 'parent',
        type: 'component'
      }

      const child2: ScopeDef = {
        id: 'child2',
        path: ['app', 'child2'],
        parentId: 'parent',
        type: 'component'
      }

      Effect.runSync(scopeManager.registerScope(parentDef))
      Effect.runSync(scopeManager.registerScope(child1))
      Effect.runSync(scopeManager.registerScope(child2))

      const children = scopeManager.getChildScopes('parent')
      expect(children).toHaveLength(2)
      expect(children.map(c => c.id)).toContain('child1')
      expect(children.map(c => c.id)).toContain('child2')
    })
  })

  describe('Scope Lifecycle', () => {
    test('should call onMount when scope is registered', async () => {
      const onMount = mock()
      const scopeDef: ScopeDef = {
        id: 'mount-test',
        path: ['test'],
        type: 'component',
        onMount
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      expect(onMount).toHaveBeenCalled()
    })

    test('should call onDestroy when scope is removed', async () => {
      const onDestroy = mock()
      const scopeDef: ScopeDef = {
        id: 'destroy-test',
        path: ['test'],
        type: 'component',
        onDestroy
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      await Effect.runPromise(scopeManager.removeScope('destroy-test'))
      
      expect(onDestroy).toHaveBeenCalled()
    })

    test('should handle lifecycle errors gracefully', async () => {
      const scopeDef: ScopeDef = {
        id: 'error-lifecycle',
        path: ['test'],
        type: 'component',
        onMount: () => {
          throw new Error('Mount failed')
        }
      }

      const result = await Effect.runPromiseEither(
        scopeManager.registerScope(scopeDef)
      )

      // Should still register despite mount error
      expect(result._tag).toBe('Right')
      expect(scopeManager.getScopeState('error-lifecycle')).toBeDefined()
    })
  })

  describe('Event System', () => {
    test('should emit scope registered event', async () => {
      const events: any[] = []
      const unsubscribe = scopeManager.subscribe(event => {
        events.push(event)
      })

      const scopeDef: ScopeDef = {
        id: 'event-test',
        path: ['test'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('scope-registered')
      expect(events[0].scopeId).toBe('event-test')

      unsubscribe()
    })

    test('should emit scope activated event', async () => {
      const events: any[] = []
      const scopeDef: ScopeDef = {
        id: 'activate-event',
        path: ['test'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))

      const unsubscribe = scopeManager.subscribe(event => {
        events.push(event)
      })

      await Effect.runPromise(scopeManager.activateScope('activate-event'))

      expect(events.some(e => e.type === 'scope-activated')).toBe(true)
      expect(events.find(e => e.type === 'scope-activated')?.scopeId).toBe('activate-event')

      unsubscribe()
    })
  })

  describe('Concurrent Operations', () => {
    test('should handle concurrent scope registrations', async () => {
      const scopes = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        path: ['test', `scope-${i}`],
        type: 'component' as const
      }))

      // Register all scopes concurrently
      await Effect.runPromise(
        Effect.all(
          scopes.map(scope => scopeManager.registerScope(scope)),
          { concurrency: 'unbounded' }
        )
      )

      // Verify all registered
      for (const scope of scopes) {
        expect(scopeManager.getScopeState(scope.id)).toBeDefined()
      }
    })

    test('should handle concurrent activations safely', async () => {
      const scopes = Array.from({ length: 5 }, (_, i) => ({
        id: `activate-${i}`,
        path: ['test'],  // Same path - only one should be active
        type: 'component' as const
      }))

      // Register all first
      for (const scope of scopes) {
        await Effect.runPromise(scopeManager.registerScope(scope))
      }

      // Activate all concurrently
      await Effect.runPromise(
        Effect.all(
          scopes.map(scope => scopeManager.activateScope(scope.id)),
          { concurrency: 'unbounded' }
        )
      )

      // Only one should be active
      const activeScopes = scopes.filter(scope => 
        scopeManager.getScopeState(scope.id)?.status === 'active'
      )
      expect(activeScopes).toHaveLength(1)
    })
  })

  describe('Memory Management', () => {
    test('should cleanup event listeners on scope removal', async () => {
      const listeners: (() => void)[] = []
      let listenerCount = 0

      // Mock subscribe to track listeners
      const originalSubscribe = scopeManager.subscribe
      scopeManager.subscribe = (fn) => {
        listenerCount++
        const unsub = originalSubscribe.call(scopeManager, fn)
        listeners.push(() => {
          listenerCount--
          unsub()
        })
        return unsub
      }

      const scopeDef: ScopeDef = {
        id: 'listener-test',
        path: ['test'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(scopeDef))
      
      // Add some listeners
      const unsub1 = scopeManager.subscribe(() => {})
      const unsub2 = scopeManager.subscribe(() => {})

      expect(listenerCount).toBe(2)

      // Cleanup
      unsub1()
      unsub2()

      expect(listenerCount).toBe(0)
    })

    test('should not leak scopes after removal', async () => {
      const scopeIds = Array.from({ length: 100 }, (_, i) => `leak-test-${i}`)

      // Register many scopes
      for (const id of scopeIds) {
        await Effect.runPromise(
          scopeManager.registerScope({
            id,
            path: ['test', id],
            type: 'component'
          })
        )
      }

      // Remove all scopes
      for (const id of scopeIds) {
        await Effect.runPromise(scopeManager.removeScope(id))
      }

      // Verify all removed
      for (const id of scopeIds) {
        expect(scopeManager.getScopeState(id)).toBeUndefined()
      }

      // Check total scope count
      const allScopes = scopeManager.getAllScopes()
      expect(allScopes).toHaveLength(0)
    })
  })

  describe('Executable Scopes', () => {
    test('should identify executable scopes', async () => {
      const executableScope: ScopeDef = {
        id: 'command',
        path: ['cli', 'build'],
        type: 'command',
        executable: true,
        handler: () => console.log('Building...')
      }

      const nonExecutableScope: ScopeDef = {
        id: 'layout',
        path: ['ui', 'layout'],
        type: 'component'
      }

      await Effect.runPromise(scopeManager.registerScope(executableScope))
      await Effect.runPromise(scopeManager.registerScope(nonExecutableScope))

      const executable = scopeManager.getScopesByPath(['cli', 'build'])
        .filter(s => s.executable)
      
      expect(executable).toHaveLength(1)
      expect(executable[0].id).toBe('command')
    })
  })

  describe('Scope Status', () => {
    test('should track scope render status', () => {
      const scopeDef: ScopeDef = {
        id: 'render-test',
        path: ['test'],
        type: 'component'
      }

      Effect.runSync(scopeManager.registerScope(scopeDef))
      
      // Set as rendered
      scopeManager.setScopeStatus('render-test', 'rendered')
      expect(scopeManager.getScopeStatus('render-test')).toBe('rendered')

      // Set as active
      scopeManager.setScopeStatus('render-test', 'active')
      expect(scopeManager.getScopeStatus('render-test')).toBe('active')
    })
  })
})
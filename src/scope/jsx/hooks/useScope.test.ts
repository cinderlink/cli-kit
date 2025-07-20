/**
 * Scope JSX Hooks Tests
 * 
 * Tests for the scope system JSX integration hooks including:
 * - useScope hook for registering scopes in components
 * - useActiveScope for tracking active scope
 * - useScopeContext for accessing scope context
 * - Lifecycle integration with onMount/onDestroy
 * - Reactive scope updates
 * - Parent-child scope relationships
 * - Error handling in hooks
 */

import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test'
import { Effect } from 'effect'
import { 
  useScope, 
  useActiveScope, 
  useScopeContext,
  useScopeStore
} from './useScope'
import { scopeManager } from '../../manager'
import { onMount, onDestroy, getContext } from '../../../reactivity/jsx-lifecycle'
import type { ScopeDef } from '../../types'

// Mock the lifecycle functions
const mockOnMount = mock()
const mockOnDestroy = mock()
const mockGetContext = mock()

// Store original functions
const originalOnMount = onMount
const originalOnDestroy = onDestroy
const originalGetContext = getContext

describe('Scope JSX Hooks', () => {
  beforeEach(() => {
    // Clear scope manager
    scopeManager.clear()
    
    // Reset mocks
    mockOnMount.mockClear()
    mockOnDestroy.mockClear()
    mockGetContext.mockClear()
    
    // Mock lifecycle functions
    (global as any).onMount = mockOnMount
    (global as any).onDestroy = mockOnDestroy
    (global as any).getContext = mockGetContext
  })

  afterEach(() => {
    // Restore original functions
    (global as any).onMount = originalOnMount
    (global as any).onDestroy = originalOnDestroy
    (global as any).getContext = originalGetContext
  })

  describe('useScope', () => {
    test('should register a scope and return ScopeDef', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app', 'test'],
        parentScopeId: 'parent-123'
      })

      const scopeOptions = {
        type: 'component' as const,
        metadata: { name: 'TestComponent' }
      }

      const scope = useScope(scopeOptions)

      // Should have generated an ID
      expect(scope.id).toBeDefined()
      expect(scope.id).toMatch(/^scope-/)
      
      // Should have correct properties
      expect(scope.type).toBe('component')
      expect(scope.path).toEqual(['app', 'test'])
      expect(scope.parentId).toBe('parent-123')
      expect(scope.metadata).toEqual({ name: 'TestComponent' })
      
      // Should register with scope manager
      const registered = scopeManager.getScopeState(scope.id)
      expect(registered).toBeDefined()
      expect(registered?.scope).toEqual(scope)
    })

    test('should register cleanup on destroy', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const scope = useScope({ type: 'component' })

      // Check that onDestroy was called
      expect(mockOnDestroy).toHaveBeenCalledTimes(1)
      
      // Get the cleanup function
      const cleanupFn = mockOnDestroy.mock.calls[0][0]
      
      // Execute cleanup
      cleanupFn()
      
      // Scope should be removed
      expect(scopeManager.getScopeState(scope.id)).toBeUndefined()
    })

    test('should handle custom onActivate callback', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const onActivate = mock()
      const scope = useScope({
        type: 'component',
        onActivate
      })

      // Activate the scope
      Effect.runSync(scopeManager.activateScope(scope.id))
      
      expect(onActivate).toHaveBeenCalledTimes(1)
    })

    test('should handle custom onDeactivate callback', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const onDeactivate = mock()
      const scope = useScope({
        type: 'component',
        onDeactivate
      })

      // Activate then deactivate
      Effect.runSync(scopeManager.activateScope(scope.id))
      Effect.runSync(scopeManager.deactivateScope(scope.id))
      
      expect(onDeactivate).toHaveBeenCalledTimes(1)
    })

    test('should generate unique IDs for multiple scopes', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const scope1 = useScope({ type: 'component' })
      const scope2 = useScope({ type: 'component' })
      const scope3 = useScope({ type: 'component' })
      
      expect(scope1.id).not.toBe(scope2.id)
      expect(scope2.id).not.toBe(scope3.id)
      expect(scope1.id).not.toBe(scope3.id)
    })

    test('should inherit context from parent', () => {
      // First call - parent scope
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app'],
        parentScopeId: undefined
      })
      
      const parentScope = useScope({ type: 'component' })
      
      // Second call - child scope
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app', 'child'],
        parentScopeId: parentScope.id
      })
      
      const childScope = useScope({ type: 'component' })
      
      expect(childScope.parentId).toBe(parentScope.id)
      expect(childScope.path).toEqual(['app', 'child'])
      
      // Verify parent-child relationship in manager
      const parentState = scopeManager.getScopeState(parentScope.id)
      expect(parentState?.childIds).toContain(childScope.id)
    })
  })

  describe('useActiveScope', () => {
    test('should return current active scope for path', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app', 'home'],
        parentScopeId: undefined
      })

      // Register and activate a scope
      const scope = useScope({ type: 'component' })
      Effect.runSync(scopeManager.activateScope(scope.id))
      
      // Get active scope
      const activeScope = useActiveScope()
      
      expect(activeScope).toBe(scope.id)
    })

    test('should return null when no active scope', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app', 'empty'],
        parentScopeId: undefined
      })

      const activeScope = useActiveScope()
      
      expect(activeScope).toBeNull()
    })

    test('should update when active scope changes', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app', 'test'],
        parentScopeId: undefined
      })

      // Register two scopes with same path
      const scope1 = useScope({ type: 'component' })
      const scope2 = useScope({ type: 'component' })
      
      // Initially no active scope
      expect(useActiveScope()).toBeNull()
      
      // Activate first scope
      Effect.runSync(scopeManager.activateScope(scope1.id))
      expect(useActiveScope()).toBe(scope1.id)
      
      // Activate second scope - should deactivate first
      Effect.runSync(scopeManager.activateScope(scope2.id))
      expect(useActiveScope()).toBe(scope2.id)
    })
  })

  describe('useScopeContext', () => {
    test('should provide access to scope context data', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app', 'test'],
        parentScopeId: undefined,
        metadata: {
          user: 'test-user',
          permissions: ['read', 'write']
        }
      })

      const scope = useScope({ 
        type: 'component',
        metadata: { version: '1.0.0' }
      })
      
      const context = useScopeContext(scope.id)
      
      expect(context).toBeDefined()
      expect(context.scope).toEqual(scope)
      expect(context.isActive).toBe(false)
      expect(context.path).toEqual(['app', 'test'])
    })

    test('should reflect activation state', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const scope = useScope({ type: 'component' })
      
      let context = useScopeContext(scope.id)
      expect(context.isActive).toBe(false)
      
      // Activate scope
      Effect.runSync(scopeManager.activateScope(scope.id))
      
      context = useScopeContext(scope.id)
      expect(context.isActive).toBe(true)
    })

    test('should include parent and children info', () => {
      // Create parent
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app'],
        parentScopeId: undefined
      })
      const parent = useScope({ type: 'component' })
      
      // Create child
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app', 'child'],
        parentScopeId: parent.id
      })
      const child = useScope({ type: 'component' })
      
      // Get parent context
      const parentContext = useScopeContext(parent.id)
      expect(parentContext.children).toContain(child.id)
      expect(parentContext.parent).toBeUndefined()
      
      // Get child context
      const childContext = useScopeContext(child.id)
      expect(childContext.parent).toBe(parent.id)
      expect(childContext.children).toEqual([])
    })

    test('should return null for non-existent scope', () => {
      const context = useScopeContext('non-existent')
      expect(context).toBeNull()
    })
  })

  describe('useScopeStore', () => {
    test('should provide reactive scope store', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app'],
        parentScopeId: undefined
      })

      const scope = useScope({ type: 'component' })
      const store = useScopeStore(scope.id)
      
      expect(store).toBeDefined()
      expect(store.subscribe).toBeInstanceOf(Function)
      expect(store.get).toBeInstanceOf(Function)
    })

    test('should update when scope state changes', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app'],
        parentScopeId: undefined
      })

      const scope = useScope({ type: 'component' })
      const store = useScopeStore(scope.id)
      
      const states: any[] = []
      const unsubscribe = store.subscribe(state => {
        states.push(state)
      })
      
      // Initial state
      expect(store.get().status).toBe('inactive')
      
      // Activate
      Effect.runSync(scopeManager.activateScope(scope.id))
      
      // Should have received update
      expect(states.length).toBeGreaterThan(0)
      expect(states[states.length - 1].status).toBe('active')
      
      unsubscribe()
    })
  })

  describe('Error handling', () => {
    test('should handle registration errors gracefully', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      // Mock registration to fail
      const originalRegister = scopeManager.registerScope
      scopeManager.registerScope = () => 
        Effect.fail(new Error('Registration failed'))
      
      // Should not throw
      const scope = useScope({ type: 'component' })
      expect(scope.id).toBeDefined()
      
      // Restore
      scopeManager.registerScope = originalRegister
    })

    test('should handle cleanup errors gracefully', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['test'],
        parentScopeId: undefined
      })

      const scope = useScope({ type: 'component' })
      
      // Mock removal to fail
      const originalRemove = scopeManager.removeScope
      scopeManager.removeScope = () => 
        Effect.fail(new Error('Removal failed'))
      
      // Get cleanup function
      const cleanupFn = mockOnDestroy.mock.calls[0][0]
      
      // Should not throw
      expect(() => cleanupFn()).not.toThrow()
      
      // Restore
      scopeManager.removeScope = originalRemove
    })
  })

  describe('Complex scenarios', () => {
    test('should handle rapid activation changes', () => {
      mockGetContext.mockReturnValue({
        currentPath: ['app'],
        parentScopeId: undefined
      })

      const scopes = Array.from({ length: 5 }, () => 
        useScope({ type: 'component' })
      )
      
      // Rapidly activate different scopes
      scopes.forEach(scope => {
        Effect.runSync(scopeManager.activateScope(scope.id))
      })
      
      // Only last should be active
      const activeStates = scopes.map(s => 
        scopeManager.getScopeState(s.id)?.status
      )
      
      expect(activeStates.filter(s => s === 'active')).toHaveLength(1)
      expect(activeStates[4]).toBe('active')
    })

    test('should maintain hierarchy during batch operations', () => {
      // Create a hierarchy
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app'],
        parentScopeId: undefined
      })
      const root = useScope({ type: 'component' })
      
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app', 'level1'],
        parentScopeId: root.id
      })
      const level1 = useScope({ type: 'component' })
      
      mockGetContext.mockReturnValueOnce({
        currentPath: ['app', 'level1', 'level2'],
        parentScopeId: level1.id
      })
      const level2 = useScope({ type: 'component' })
      
      // Verify hierarchy
      const rootState = scopeManager.getScopeState(root.id)
      const level1State = scopeManager.getScopeState(level1.id)
      const level2State = scopeManager.getScopeState(level2.id)
      
      expect(rootState?.childIds).toContain(level1.id)
      expect(level1State?.childIds).toContain(level2.id)
      expect(level2State?.parentId).toBe(level1.id)
    })
  })
})
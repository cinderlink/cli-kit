/**
 * Focus Manager Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Effect, Option } from 'effect'
import { FocusService, FocusServiceLive, focusable, withFocus } from './manager'

describe('FocusManager', () => {
  describe('FocusService', () => {
    const createTestService = () => Effect.runSync(Effect.scoped(FocusServiceLive))

    describe('register/unregister', () => {
      it('should register a focusable component', () => {
        const service = createTestService()
        const component = focusable('test-button', 0)

        Effect.runSync(service.register(component))
        const tabOrder = Effect.runSync(service.getTabOrder())

        expect(tabOrder).toHaveLength(1)
        expect(tabOrder[0].id).toBe('test-button')
      })

      it('should unregister a component', () => {
        const service = createTestService()
        const component = focusable('test-button', 0)

        Effect.runSync(service.register(component))
        Effect.runSync(service.unregister('test-button'))
        const tabOrder = Effect.runSync(service.getTabOrder())

        expect(tabOrder).toHaveLength(0)
      })

      it('should update component when registering with same id', () => {
        const service = createTestService()
        const component1 = focusable('test-button', 0)
        const component2 = focusable('test-button', 1)

        Effect.runSync(service.register(component1))
        Effect.runSync(service.register(component2))
        const tabOrder = Effect.runSync(service.getTabOrder())

        expect(tabOrder).toHaveLength(1)
        expect(tabOrder[0].tabIndex).toBe(1)
      })
    })

    describe('focus management', () => {
      it('should set focus to a component', () => {
        const service = createTestService()
        const component = focusable('test-button', 0)

        Effect.runSync(service.register(component))
        const result = Effect.runSync(service.setFocus('test-button'))

        expect(result).toBe(true)
        expect(Effect.runSync(service.hasFocus('test-button'))).toBe(true)
      })

      it('should not focus non-focusable component', () => {
        const service = createTestService()
        const component = focusable('test-label', 0, { focusable: false })

        Effect.runSync(service.register(component))
        const result = Effect.runSync(service.setFocus('test-label'))

        expect(result).toBe(false)
      })

      it('should clear focus', () => {
        const service = createTestService()
        const component = focusable('test-button', 0)

        Effect.runSync(service.register(component))
        Effect.runSync(service.setFocus('test-button'))
        Effect.runSync(service.clearFocus())

        expect(Effect.runSync(service.hasFocus('test-button'))).toBe(false)
        expect(Option.isNone(Effect.runSync(service.getCurrentFocus()))).toBe(true)
      })

      it('should call onFocus and onBlur handlers', () => {
        const service = createTestService()
        let focusCalled = false
        let blurCalled = false

        const component = focusable('test-button', 0, {
          onFocus: () =>
            Effect.sync(() => {
              focusCalled = true
            }),
          onBlur: () =>
            Effect.sync(() => {
              blurCalled = true
            }),
        })

        Effect.runSync(service.register(component))
        Effect.runSync(service.setFocus('test-button'))

        expect(focusCalled).toBe(true)
        expect(blurCalled).toBe(false)

        Effect.runSync(service.clearFocus())
        expect(blurCalled).toBe(true)
      })
    })

    describe('focus navigation', () => {
      beforeEach(() => {
        // Reset any shared state
      })

      it('should navigate to next component', () => {
        const service = createTestService()
        const button1 = focusable('button1', 0)
        const button2 = focusable('button2', 1)
        const button3 = focusable('button3', 2)

        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))
        Effect.runSync(service.register(button3))

        Effect.runSync(service.setFocus('button1'))
        const next = Effect.runSync(service.focusNext())

        expect(Option.isSome(next)).toBe(true)
        expect(Option.getOrNull(next)).toBe('button2')
        expect(Effect.runSync(service.hasFocus('button2'))).toBe(true)
      })

      it('should wrap around when navigating past last component', () => {
        const service = createTestService()
        const button1 = focusable('button1', 0)
        const button2 = focusable('button2', 1)

        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))

        Effect.runSync(service.setFocus('button2'))
        const next = Effect.runSync(service.focusNext())

        expect(Option.getOrNull(next)).toBe('button1')
      })

      it('should navigate to previous component', () => {
        const service = createTestService()
        const button1 = focusable('button1', 0)
        const button2 = focusable('button2', 1)

        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))

        Effect.runSync(service.setFocus('button2'))
        const prev = Effect.runSync(service.focusPrevious())

        expect(Option.getOrNull(prev)).toBe('button1')
      })

      it('should respect tab order', () => {
        const service = createTestService()
        const button1 = focusable('button1', 2)
        const button2 = focusable('button2', 1)
        const button3 = focusable('button3', 0)

        // Register in different order than tab index
        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))
        Effect.runSync(service.register(button3))

        const tabOrder = Effect.runSync(service.getTabOrder())
        expect(tabOrder[0].id).toBe('button3') // tabIndex 0
        expect(tabOrder[1].id).toBe('button2') // tabIndex 1
        expect(tabOrder[2].id).toBe('button1') // tabIndex 2
      })
    })

    describe('focus trapping', () => {
      it('should trap focus within a component', () => {
        const service = createTestService()
        const modal = focusable('modal', 0)
        const button1 = focusable('button1', 1)
        const button2 = focusable('button2', 2)

        Effect.runSync(service.register(modal))
        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))

        Effect.runSync(service.trapFocus('modal'))
        const tabOrder = Effect.runSync(service.getTabOrder())

        // Only the trap component should be in tab order
        expect(tabOrder).toHaveLength(1)
        expect(tabOrder[0].id).toBe('modal')
      })

      it('should save and restore focus when trapping', () => {
        const service = createTestService()
        const button = focusable('button', 0)
        const modal = focusable('modal', 1)

        Effect.runSync(service.register(button))
        Effect.runSync(service.register(modal))

        Effect.runSync(service.setFocus('button'))
        Effect.runSync(service.trapFocus('modal'))

        // Modal should have focus
        expect(Effect.runSync(service.hasFocus('modal'))).toBe(true)

        Effect.runSync(service.releaseTrap())

        // Focus should be restored to button
        expect(Effect.runSync(service.hasFocus('button'))).toBe(true)
      })
    })

    describe('focus state', () => {
      it('should save and restore focus state', () => {
        const service = createTestService()
        const button1 = focusable('button1', 0)
        const button2 = focusable('button2', 1)

        Effect.runSync(service.register(button1))
        Effect.runSync(service.register(button2))

        Effect.runSync(service.setFocus('button1'))
        Effect.runSync(service.saveFocusState())
        Effect.runSync(service.setFocus('button2'))

        expect(Effect.runSync(service.hasFocus('button2'))).toBe(true)

        Effect.runSync(service.restoreFocusState())
        expect(Effect.runSync(service.hasFocus('button1'))).toBe(true)
      })
    })
  })

  describe('utility functions', () => {
    it('should create focusable component with defaults', () => {
      const component = focusable('test-id')

      expect(component.id).toBe('test-id')
      expect(component.tabIndex).toBe(0)
      expect(component.focusable).toBe(true)
      expect(component.trapped).toBeUndefined()
    })

    it('should create focusable component with options', () => {
      const component = focusable('test-id', 5, {
        focusable: false,
        trapped: true,
      })

      expect(component.tabIndex).toBe(5)
      expect(component.focusable).toBe(false)
      expect(component.trapped).toBe(true)
    })
  })

  describe('withFocus', () => {
    it('should register and unregister component with resource management', async () => {
      const service = Effect.runSync(Effect.scoped(FocusServiceLive))
      const component = focusable('test-resource', 0)

      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* (_) {
            yield* _(Effect.provideService(withFocus(component), FocusService, service))

            const tabOrder = Effect.runSync(service.getTabOrder())
            expect(tabOrder).toHaveLength(1)
          })
        )
      )

      // After scope exits, component should be unregistered
      const tabOrder = Effect.runSync(service.getTabOrder())
      expect(tabOrder).toHaveLength(0)
    })
  })
})

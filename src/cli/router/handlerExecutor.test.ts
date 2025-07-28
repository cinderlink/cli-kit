/**
 * Handler Executor Tests
 */

import { describe, it, expect } from 'bun:test'
import { HandlerExecutor } from './handlerExecutor'
import type { Handler, LazyHandler } from '../types'

describe('HandlerExecutor', () => {
  describe('isLazyHandler', () => {
    it('should identify lazy handlers', () => {
      const executor = new HandlerExecutor()

      // Zero-argument function (lazy)
      const lazyHandler = () => Promise.resolve(() => {})
      expect(executor.isLazyHandler(lazyHandler)).toBe(true)

      // Function with arguments (not lazy)
      const regularHandler = (args: Record<string, unknown>) => {}
      expect(executor.isLazyHandler(regularHandler)).toBe(false)
    })
  })

  describe('executeHandler', () => {
    it('should execute regular handlers', async () => {
      const executor = new HandlerExecutor()
      const handler: Handler = args => {
        return { result: 'success', args }
      }

      const result = await executor.executeHandler(handler, { foo: 'bar' })
      expect(result).toEqual({ result: 'success', args: { foo: 'bar' } })
    })

    it('should execute async handlers', async () => {
      const executor = new HandlerExecutor()
      const handler: Handler = async args => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { result: 'async', args }
      }

      const result = await executor.executeHandler(handler, { foo: 'bar' })
      expect(result).toEqual({ result: 'async', args: { foo: 'bar' } })
    })

    it('should execute lazy handlers', async () => {
      const executor = new HandlerExecutor()
      const actualHandler: Handler = args => ({ lazy: true, args })
      const lazyHandler: LazyHandler = async () => actualHandler

      const result = await executor.executeHandler(lazyHandler, { foo: 'bar' }, true)
      expect(result).toEqual({ lazy: true, args: { foo: 'bar' } })
    })

    it('should enhance errors with context', async () => {
      const executor = new HandlerExecutor()
      const handler: Handler = () => {
        throw new Error('Handler failed')
      }

      try {
        await executor.executeHandler(handler, {})
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Command execution failed: Handler failed')
      }
    })
  })

  describe('executeWithMiddleware', () => {
    it('should apply middleware in correct order', async () => {
      const executor = new HandlerExecutor()
      const order: string[] = []

      const handler: Handler = args => {
        order.push('handler')
        return { result: 'done' }
      }

      const middleware1 = (next: Handler) => (args: Record<string, unknown>) => {
        order.push('middleware1-before')
        const result = next(args)
        order.push('middleware1-after')
        return result
      }

      const middleware2 = (next: Handler) => (args: Record<string, unknown>) => {
        order.push('middleware2-before')
        const result = next(args)
        order.push('middleware2-after')
        return result
      }

      await executor.executeWithMiddleware(handler, {}, [middleware1, middleware2])

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ])
    })

    it('should handle zero-arg handlers with middleware', async () => {
      const executor = new HandlerExecutor()

      // Zero-arg handler that returns result directly
      const handler = () => ({ result: 'zero-arg' })

      const middleware = (next: Handler) => next

      const result = await executor.executeWithMiddleware(handler, {}, [middleware])
      expect(result).toEqual({ result: 'zero-arg' })
    })

    it('should handle lazy handlers with middleware', async () => {
      const executor = new HandlerExecutor()

      // Lazy handler
      const actualHandler: Handler = args => ({ lazy: true, args })
      const lazyHandler = async () => actualHandler

      const middleware = (next: Handler) => next

      const result = await executor.executeWithMiddleware(lazyHandler, { foo: 'bar' }, [middleware])
      expect(result).toEqual({ lazy: true, args: { foo: 'bar' } })
    })
  })
})

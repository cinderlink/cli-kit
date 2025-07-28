/**
 * Middleware Manager Tests
 */

import { describe, it, expect } from 'bun:test'
import { MiddlewareManager } from './middleware'
import type { Handler } from '../types'

describe('MiddlewareManager', () => {
  describe('addMiddleware', () => {
    it('should add middleware', () => {
      const manager = new MiddlewareManager()
      const middleware = (handler: Handler) => handler

      manager.addMiddleware(middleware)
      expect(manager.count).toBe(1)
    })

    it('should add multiple middleware', () => {
      const manager = new MiddlewareManager()
      const middleware1 = (handler: Handler) => handler
      const middleware2 = (handler: Handler) => handler

      manager.addMiddleware(middleware1)
      manager.addMiddleware(middleware2)
      expect(manager.count).toBe(2)
    })
  })

  describe('getMiddleware', () => {
    it('should return all middleware', () => {
      const manager = new MiddlewareManager()
      const middleware1 = (handler: Handler) => handler
      const middleware2 = (handler: Handler) => handler

      manager.addMiddleware(middleware1)
      manager.addMiddleware(middleware2)

      const all = manager.getMiddleware()
      expect(all.length).toBe(2)
      expect(all[0]).toBe(middleware1)
      expect(all[1]).toBe(middleware2)
    })

    it('should return a copy of middleware array', () => {
      const manager = new MiddlewareManager()
      const middleware = (handler: Handler) => handler

      manager.addMiddleware(middleware)
      const all1 = manager.getMiddleware()
      const all2 = manager.getMiddleware()

      expect(all1).not.toBe(all2) // Different arrays
      expect(all1).toEqual(all2) // Same contents
    })
  })

  describe('clearMiddleware', () => {
    it('should clear all middleware', () => {
      const manager = new MiddlewareManager()
      const middleware1 = (handler: Handler) => handler
      const middleware2 = (handler: Handler) => handler

      manager.addMiddleware(middleware1)
      manager.addMiddleware(middleware2)
      expect(manager.count).toBe(2)

      manager.clearMiddleware()
      expect(manager.count).toBe(0)
      expect(manager.getMiddleware()).toEqual([])
    })
  })

  describe('applyMiddleware', () => {
    it('should apply middleware in reverse order', () => {
      const manager = new MiddlewareManager()
      const order: string[] = []

      const handler: Handler = args => {
        order.push('handler')
        return { result: 'done' }
      }

      const middleware1 = (next: Handler) => (args: Record<string, unknown>) => {
        order.push('middleware1')
        return next(args)
      }

      const middleware2 = (next: Handler) => (args: Record<string, unknown>) => {
        order.push('middleware2')
        return next(args)
      }

      manager.addMiddleware(middleware1)
      manager.addMiddleware(middleware2)

      const wrapped = manager.applyMiddleware(handler)
      wrapped({})

      // Middleware2 is added last but wraps first (reverse order)
      expect(order).toEqual(['middleware1', 'middleware2', 'handler'])
    })

    it('should return original handler if no middleware', () => {
      const manager = new MiddlewareManager()
      const handler: Handler = args => ({ result: 'done' })

      const wrapped = manager.applyMiddleware(handler)
      expect(wrapped).toBe(handler)
    })

    it('should allow middleware to modify results', () => {
      const manager = new MiddlewareManager()

      const handler: Handler = args => ({ result: 'original' })

      const middleware = (next: Handler) => (args: Record<string, unknown>) => {
        const result = next(args)
        return { ...result, modified: true }
      }

      manager.addMiddleware(middleware)

      const wrapped = manager.applyMiddleware(handler)
      const result = wrapped({})

      expect(result).toEqual({ result: 'original', modified: true })
    })
  })
})

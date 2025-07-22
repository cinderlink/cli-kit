/**
 * Transaction Storage Implementation
 * 
 * Manages atomic file operations with rollback support
 */

import { Effect, Ref } from "effect"
import { StorageError } from "../../../types/errors"
import * as fs from "node:fs/promises"

interface TransactionOperation {
  operation: 'write' | 'delete'
  path: string
  content?: string
}

/**
 * Transaction-based storage operations
 */
export class TransactionStorage {
  constructor(
    private transactions: Ref.Ref<Map<string, Array<TransactionOperation>>>
  ) {}

  /**
   * Begin a new transaction
   */
  beginTransaction(): Effect<string, never> {
    return Effect.gen(function* (_) {
      const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`
      
      yield* _(Ref.update(this.transactions, txMap => {
        const newMap = new Map(txMap)
        newMap.set(transactionId, [])
        return newMap
      }))
      
      return transactionId
    }.bind(this))
  }

  /**
   * Add an operation to a transaction
   */
  addToTransaction(
    transactionId: string, 
    operation: 'write' | 'delete', 
    filePath: string, 
    content?: string
  ): Effect<void, StorageError> {
    return Effect.gen(function* (_) {
      const txMap = yield* _(Ref.get(this.transactions))
      
      if (!txMap.has(transactionId)) {
        return yield* _(Effect.fail(new StorageError({
          message: `Transaction not found: ${transactionId}`
        })))
      }
      
      yield* _(Ref.update(this.transactions, map => {
        const newMap = new Map(map)
        const ops = newMap.get(transactionId) || []
        ops.push({ operation, path: filePath, content })
        newMap.set(transactionId, ops)
        return newMap
      }))
    }.bind(this))
  }

  /**
   * Commit a transaction
   */
  commitTransaction(transactionId: string): Effect<void, StorageError> {
    return Effect.gen(function* (_) {
      const txMap = yield* _(Ref.get(this.transactions))
      const operations = txMap.get(transactionId)
      
      if (!operations) {
        return yield* _(Effect.fail(new StorageError({
          message: `Transaction not found: ${transactionId}`
        })))
      }
      
      // Execute all operations
      const backups: Array<{ path: string, content: string | null }> = []
      
      try {
        for (const op of operations) {
          if (op.operation === 'write') {
            // Backup existing file if it exists
            try {
              const existing = yield* _(Effect.promise(() => fs.readFile(op.path, 'utf8')))
              backups.push({ path: op.path, content: existing })
            } catch {
              backups.push({ path: op.path, content: null })
            }
            
            // Write new content
            yield* _(Effect.promise(() => fs.writeFile(op.path, op.content || '', 'utf8')))
          } else if (op.operation === 'delete') {
            // Backup existing file
            try {
              const existing = yield* _(Effect.promise(() => fs.readFile(op.path, 'utf8')))
              backups.push({ path: op.path, content: existing })
            } catch {
              backups.push({ path: op.path, content: null })
            }
            
            // Delete file
            yield* _(Effect.promise(() => fs.unlink(op.path)))
          }
        }
        
        // Transaction successful, clean up
        yield* _(Ref.update(this.transactions, map => {
          const newMap = new Map(map)
          newMap.delete(transactionId)
          return newMap
        }))
      } catch (error) {
        // Rollback on error
        for (const backup of backups) {
          try {
            if (backup.content === null) {
              // File didn't exist, remove it
              yield* _(Effect.promise(() => fs.unlink(backup.path)).pipe(Effect.catchAll(() => Effect.succeed(undefined))))
            } else {
              // Restore original content
              yield* _(Effect.promise(() => fs.writeFile(backup.path, backup.content, 'utf8')))
            }
          } catch {
            // Best effort rollback
          }
        }
        
        return yield* _(Effect.fail(new StorageError({
          message: `Transaction failed: ${transactionId}`,
          cause: error
        })))
      }
    }.bind(this))
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction(transactionId: string): Effect<void, never> {
    return Ref.update(this.transactions, map => {
      const newMap = new Map(map)
      newMap.delete(transactionId)
      return newMap
    })
  }
}
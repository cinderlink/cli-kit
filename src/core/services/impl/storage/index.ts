/**
 * Storage Service Implementation
 *
 * Main storage service that combines all storage subsystems
 */

import { Effect, Layer, Ref } from 'effect'
import { StorageService, StorageUtils } from '@core/services/storage'
import { StateStorage } from './state'
import { ConfigStorage } from './config'
import { CacheStorage } from './cache'
import { FileStorage } from './file'
import { TransactionStorage } from './transaction'
import * as path from 'node:path'

/**
 * Create the live Storage service implementation
 */
export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* (_) {
    // In-memory storage for state
    const stateStore = yield* _(Ref.make<Map<string, string>>(new Map()))

    // In-memory cache with TTL
    const cacheStore = yield* _(
      Ref.make<Map<string, { data: unknown; expires: number | null; createdAt: number }>>(new Map())
    )

    // Config storage
    const configStore = yield* _(Ref.make<Map<string, unknown>>(new Map()))

    // Transaction tracking
    const transactions = yield* _(
      Ref.make<
        Map<string, Array<{ operation: 'write' | 'delete'; path: string; content?: string }>>
      >(new Map())
    )

    // Helper to get app data directory
    const getAppDataDir = (appName: string): string => {
      const dataPaths = StorageUtils.getDataPaths(appName)
      return dataPaths[0] ?? ''
    }

    // Helper to get state file path
    const getStateFilePath = (key: string): string => {
      return path.join(getAppDataDir('cli-kit'), 'state', `${key}.json`)
    }

    // Initialize subsystems
    const state = new StateStorage(stateStore, getStateFilePath)
    const config = new ConfigStorage(configStore)
    const cache = new CacheStorage(cacheStore)
    const file = new FileStorage()
    const transaction = new TransactionStorage(transactions)

    return {
      // State Management
      saveState: state.saveState.bind(state),
      loadState: state.loadState.bind(state),
      clearState: state.clearState.bind(state),
      hasState: state.hasState.bind(state),
      listStateKeys: state.listStateKeys.bind(state),

      // Configuration
      loadConfig: config.loadConfig.bind(config),
      saveConfig: config.saveConfig.bind(config),
      getConfigPath: config.getConfigPath.bind(config),
      watchConfig: config.watchConfig.bind(config),

      // Cache
      setCache: cache.setCache.bind(cache),
      getCache: cache.getCache.bind(cache),
      clearCache: cache.clearCache.bind(cache),
      clearExpiredCache: cache.clearExpiredCache.bind(cache),
      getCacheStats: cache.getCacheStats.bind(cache),

      // File Operations
      readTextFile: file.readTextFile.bind(file),
      writeTextFile: file.writeTextFile.bind(file),
      readJsonFile: file.readJsonFile.bind(file),
      writeJsonFile: file.writeJsonFile.bind(file),
      fileExists: file.fileExists.bind(file),
      createDirectory: file.createDirectory.bind(file),
      getFileStats: file.getFileStats.bind(file),

      // Backup Operations
      createBackup: file.createBackup.bind(file),
      restoreBackup: file.restoreBackup.bind(file),
      listBackups: file.listBackups.bind(file),
      cleanupBackups: file.cleanupBackups.bind(file),

      // Transactions
      beginTransaction: transaction.beginTransaction.bind(transaction),
      addToTransaction: transaction.addToTransaction.bind(transaction),
      commitTransaction: transaction.commitTransaction.bind(transaction),
      rollbackTransaction: transaction.rollbackTransaction.bind(transaction),
    }
  })
)

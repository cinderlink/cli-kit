/**
 * Storage Service Implementation - Configuration and state persistence
 *
 * This module provides a comprehensive storage service for TUIX applications,
 * handling configuration files, application state, caching, and file operations.
 *
 * ## Features:
 *
 * ### State Management
 * - Persistent state storage with schema validation
 * - In-memory caching for performance
 * - Atomic state updates
 *
 * ### Configuration
 * - Application configuration with defaults
 * - Schema validation and type safety
 * - File watching for live updates
 *
 * ### Caching
 * - In-memory cache with TTL support
 * - Automatic expiration handling
 * - Cache statistics and monitoring
 *
 * ### File Operations
 * - Safe file reading/writing with backups
 * - JSON file handling with validation
 * - Directory management
 *
 * ### Transactions
 * - Atomic multi-file operations
 * - Rollback support on failure
 * - Backup and restore capabilities
 *
 * @module
 */

// Re-export everything from the storage module
export * from './storage/index'

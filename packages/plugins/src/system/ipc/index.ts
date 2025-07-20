/**
 * IPC System Entry Point
 * 
 * This module exports the complete IPC system for the Process Manager Plugin,
 * providing inter-process communication capabilities.
 * 
 * @module plugins/system/ipc
 */

// =============================================================================
// Core IPC Components
// =============================================================================

export { IPCMessageBroker } from "./broker"
export { IPCMessageClient } from "./client"
export { ProcessIPCManager } from "./manager"

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Core IPC types
  IPCMessage,
  IPCRequest,
  IPCResponse,
  IPCError,
  IPCMessageType,
  IPCMessagePriority,
  IPCMessageStatus,
  
  // Channel types
  IPCChannel,
  IPCChannelConfig,
  IPCChannelType,
  
  // Client types
  IPCClient,
  IPCClientConfig,
  IPCClientStatus,
  IPCClientMetrics,
  
  // Broker types
  IPCBroker,
  IPCBrokerConfig,
  IPCBrokerStatus,
  IPCBrokerMetrics,
  IPCBrokerEvent,
  
  // Manager types
  IPCManager,
  ProcessIPCEvent,
  ProcessConnectionInfo,
  IPCManagerMetrics,
  
  // Process-specific types
  ProcessIPCPayload,
  
  // Configuration
  IPCConfig,
  
  // Error types
  IPCConnectionError,
  IPCMessageError,
  IPCTimeoutError,
  IPCAuthenticationError,
  IPCChannelError,
} from "./types"

// =============================================================================
// Schema Exports
// =============================================================================

export { IPCConfigSchema } from "./types"

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new IPC manager with default configuration
 */
export function createIPCManager(config: Partial<import("./types").IPCConfig> = {}): ProcessIPCManager {
  return new ProcessIPCManager(config)
}

/**
 * Create a new IPC client with default configuration
 */
export function createIPCClient(config: import("./types").IPCClientConfig): IPCMessageClient {
  return new IPCMessageClient(config)
}

/**
 * Create a new IPC broker with default configuration
 */
export function createIPCBroker(config: import("./types").IPCBrokerConfig = {}): IPCMessageBroker {
  return new IPCMessageBroker(config)
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique client ID
 */
export function generateClientId(prefix: string = 'client'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique channel ID
 */
export function generateChannelId(prefix: string = 'channel'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate message structure
 */
export function validateMessage(message: any): message is import("./types").IPCMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.id === 'string' &&
    typeof message.type === 'string' &&
    message.timestamp instanceof Date &&
    typeof message.senderId === 'string' &&
    typeof message.channelId === 'string' &&
    typeof message.priority === 'string' &&
    message.payload !== undefined
  )
}

/**
 * Create a process-specific channel configuration
 */
export function createProcessChannelConfig(
  processId: string,
  channelType: import("./types").IPCChannelType = 'memory'
): import("./types").IPCChannelConfig {
  return {
    id: `process-${processId}-channel`,
    type: channelType,
    name: `Process ${processId} Channel`,
    maxConnections: 10,
    bufferSize: 65536,
    timeout: 5000,
    persistent: true
  }
}

/**
 * Create a process-specific client configuration
 */
export function createProcessClientConfig(
  processId: string,
  processName: string
): import("./types").IPCClientConfig {
  return {
    id: `process-${processId}-client`,
    name: `Client for ${processName}`,
    channels: [`process-${processId}-channel`],
    heartbeatInterval: 5000,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
    requestTimeout: 10000,
    maxQueueSize: 1000,
    enablePersistence: false
  }
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default IPC configuration
 */
export const DEFAULT_IPC_CONFIG: import("./types").IPCConfig = {
  broker: {
    maxChannels: 100,
    maxClients: 1000,
    messageRetention: 300000, // 5 minutes
    enablePersistence: false,
    heartbeatInterval: 10000,
    cleanupInterval: 30000,
    maxMessageSize: 1048576, // 1MB
    enableMetrics: true,
    enableSecurity: false,
    authenticationRequired: false
  },
  client: {
    heartbeatInterval: 5000,
    reconnectAttempts: 3,
    reconnectDelay: 5000,
    requestTimeout: 10000,
    maxQueueSize: 1000,
    enablePersistence: false
  },
  channels: [],
  security: {
    enableAuthentication: false,
    enableEncryption: false,
    allowedClients: [],
    rateLimiting: {
      enabled: false,
      maxRequests: 1000,
      windowMs: 60000
    }
  }
}

/**
 * Standard channel configurations
 */
export const STANDARD_CHANNELS: import("./types").IPCChannelConfig[] = [
  {
    id: 'process-channel',
    type: 'memory',
    name: 'Process Communication Channel',
    maxConnections: 1000,
    bufferSize: 65536,
    timeout: 5000,
    persistent: true
  },
  {
    id: 'health-channel',
    type: 'memory',
    name: 'Health Check Channel',
    maxConnections: 100,
    bufferSize: 32768,
    timeout: 3000,
    persistent: true
  },
  {
    id: 'metrics-channel',
    type: 'memory',
    name: 'Metrics Collection Channel',
    maxConnections: 50,
    bufferSize: 131072,
    timeout: 5000,
    persistent: true
  },
  {
    id: 'log-channel',
    type: 'memory',
    name: 'Log Aggregation Channel',
    maxConnections: 200,
    bufferSize: 262144,
    timeout: 10000,
    persistent: true
  }
]

/**
 * IPC message types for process management
 */
export const PROCESS_MESSAGE_TYPES = {
  PING: 'ping' as const,
  PONG: 'pong' as const,
  PROCESS_START: 'process_start' as const,
  PROCESS_STOP: 'process_stop' as const,
  PROCESS_RESTART: 'process_restart' as const,
  PROCESS_STATUS: 'process_status' as const,
  HEALTH_CHECK: 'health_check' as const,
  METRICS_REQUEST: 'metrics_request' as const,
  METRICS_RESPONSE: 'metrics_response' as const,
  LOG_MESSAGE: 'log_message' as const,
  EVENT_NOTIFICATION: 'event_notification' as const,
  BROADCAST: 'broadcast' as const,
  REQUEST: 'request' as const,
  RESPONSE: 'response' as const,
  ERROR: 'error' as const
} as const

/**
 * IPC message priorities
 */
export const MESSAGE_PRIORITIES = {
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const
} as const

/**
 * Default timeouts and intervals
 */
export const IPC_TIMEOUTS = {
  REQUEST_TIMEOUT: 10000,
  HEARTBEAT_INTERVAL: 5000,
  RECONNECT_DELAY: 5000,
  CLEANUP_INTERVAL: 30000,
  MESSAGE_TTL: 300000, // 5 minutes
  CONNECTION_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 10000
} as const

// =============================================================================
// Re-export for convenience
// =============================================================================

export { ProcessIPCManager as IPCManager }
export { IPCMessageBroker as IPCBroker }
export { IPCMessageClient as IPCClient }
/**
 * Inter-Process Communication (IPC) Types
 * 
 * This module defines the complete type system for IPC between processes,
 * including message protocols, channels, and security mechanisms.
 * 
 * @module plugins/system/ipc/types
 */

import { z } from "zod"
import { Effect, Stream } from "effect"

// =============================================================================
// IPC Message Types
// =============================================================================

/**
 * IPC message types enumeration
 */
export type IPCMessageType = 
  | 'ping'
  | 'pong'
  | 'process_start'
  | 'process_stop'
  | 'process_restart'
  | 'process_status'
  | 'health_check'
  | 'metrics_request'
  | 'metrics_response'
  | 'log_message'
  | 'event_notification'
  | 'broadcast'
  | 'request'
  | 'response'
  | 'error'

/**
 * IPC message priority levels
 */
export type IPCMessagePriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * IPC message status
 */
export type IPCMessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'expired'

/**
 * Base IPC message structure
 */
export interface IPCMessage {
  readonly id: string
  readonly type: IPCMessageType
  readonly timestamp: Date
  readonly priority: IPCMessagePriority
  readonly senderId: string
  readonly targetId?: string // undefined for broadcast
  readonly channelId: string
  readonly payload: unknown
  readonly metadata?: Record<string, unknown>
  readonly correlationId?: string // for request/response correlation
  readonly replyTo?: string // channel to reply to
  readonly ttl?: number // time-to-live in milliseconds
}

/**
 * IPC request message
 */
export interface IPCRequest extends IPCMessage {
  readonly type: 'request'
  readonly expectsResponse: true
  readonly timeout?: number
}

/**
 * IPC response message
 */
export interface IPCResponse extends IPCMessage {
  readonly type: 'response'
  readonly requestId: string
  readonly success: boolean
  readonly error?: string
}

/**
 * IPC error message
 */
export interface IPCError extends IPCMessage {
  readonly type: 'error'
  readonly error: string
  readonly code?: string
  readonly details?: Record<string, unknown>
}

// =============================================================================
// IPC Channel Types
// =============================================================================

/**
 * IPC channel types
 */
export type IPCChannelType = 'named_pipe' | 'unix_socket' | 'tcp_socket' | 'websocket' | 'memory'

/**
 * IPC channel configuration
 */
export interface IPCChannelConfig {
  readonly id: string
  readonly type: IPCChannelType
  readonly name: string
  readonly path?: string // for named pipes and unix sockets
  readonly host?: string // for TCP/WebSocket
  readonly port?: number // for TCP/WebSocket
  readonly secure?: boolean // for WebSocket/TCP
  readonly maxConnections?: number
  readonly bufferSize?: number
  readonly timeout?: number
  readonly persistent?: boolean
}

/**
 * IPC channel interface
 */
export interface IPCChannel {
  readonly id: string
  readonly config: IPCChannelConfig
  readonly isOpen: boolean
  readonly connectionCount: number
  
  // Channel lifecycle
  open(): Promise<void>
  close(): Promise<void>
  
  // Message handling
  send(message: IPCMessage): Promise<void>
  sendRequest(request: IPCRequest): Promise<IPCResponse>
  broadcast(message: IPCMessage): Promise<void>
  
  // Subscription
  subscribe(handler: (message: IPCMessage) => void | Promise<void>): () => void
  subscribeToType(type: IPCMessageType, handler: (message: IPCMessage) => void | Promise<void>): () => void
  
  // Channel management
  getConnections(): string[]
  isConnected(clientId: string): boolean
}

// =============================================================================
// IPC Client Types
// =============================================================================

/**
 * IPC client configuration
 */
export interface IPCClientConfig {
  readonly id: string
  readonly name: string
  readonly channels: string[]
  readonly heartbeatInterval?: number
  readonly reconnectAttempts?: number
  readonly reconnectDelay?: number
  readonly requestTimeout?: number
  readonly maxQueueSize?: number
  readonly enablePersistence?: boolean
}

/**
 * IPC client interface
 */
export interface IPCClient {
  readonly id: string
  readonly config: IPCClientConfig
  readonly isConnected: boolean
  readonly channels: Map<string, IPCChannel>
  
  // Connection management
  connect(channelId: string): Promise<void>
  disconnect(channelId?: string): Promise<void>
  reconnect(channelId: string): Promise<void>
  
  // Message operations
  send(channelId: string, message: Omit<IPCMessage, 'id' | 'timestamp' | 'senderId'>): Promise<void>
  sendRequest(channelId: string, request: Omit<IPCRequest, 'id' | 'timestamp' | 'senderId'>): Promise<IPCResponse>
  broadcast(message: Omit<IPCMessage, 'id' | 'timestamp' | 'senderId' | 'targetId'>): Promise<void>
  
  // Subscription
  subscribe(handler: (message: IPCMessage) => void | Promise<void>): () => void
  subscribeToChannel(channelId: string, handler: (message: IPCMessage) => void | Promise<void>): () => void
  subscribeToType(type: IPCMessageType, handler: (message: IPCMessage) => void | Promise<void>): () => void
  
  // Health and monitoring
  ping(targetId?: string): Promise<number> // returns latency in ms
  getStatus(): IPCClientStatus
  getMetrics(): IPCClientMetrics
}

/**
 * IPC client status
 */
export interface IPCClientStatus {
  readonly id: string
  readonly connected: boolean
  readonly channels: Array<{
    readonly id: string
    readonly connected: boolean
    readonly lastActivity: Date
  }>
  readonly messageQueue: number
  readonly lastHeartbeat: Date
  readonly uptime: number
}

/**
 * IPC client metrics
 */
export interface IPCClientMetrics {
  readonly messagesSent: number
  readonly messagesReceived: number
  readonly requestsSent: number
  readonly responsesReceived: number
  readonly errors: number
  readonly averageLatency: number
  readonly connectionAttempts: number
  readonly reconnections: number
}

// =============================================================================
// IPC Broker Types
// =============================================================================

/**
 * IPC broker configuration
 */
export interface IPCBrokerConfig {
  readonly maxChannels?: number
  readonly maxClients?: number
  readonly messageRetention?: number // in milliseconds
  readonly enablePersistence?: boolean
  readonly persistencePath?: string
  readonly heartbeatInterval?: number
  readonly cleanupInterval?: number
  readonly maxMessageSize?: number
  readonly enableMetrics?: boolean
  readonly enableSecurity?: boolean
  readonly authenticationRequired?: boolean
}

/**
 * IPC broker interface
 */
export interface IPCBroker {
  readonly config: IPCBrokerConfig
  readonly channels: Map<string, IPCChannel>
  readonly clients: Map<string, IPCClient>
  readonly isRunning: boolean
  
  // Broker lifecycle
  start(): Promise<void>
  stop(): Promise<void>
  
  // Channel management
  createChannel(config: IPCChannelConfig): Promise<IPCChannel>
  removeChannel(channelId: string): Promise<void>
  getChannel(channelId: string): IPCChannel | undefined
  
  // Client management
  registerClient(client: IPCClient): Promise<void>
  unregisterClient(clientId: string): Promise<void>
  getClient(clientId: string): IPCClient | undefined
  
  // Message routing
  routeMessage(message: IPCMessage): Promise<void>
  broadcastMessage(message: IPCMessage): Promise<void>
  
  // Monitoring
  getStatus(): IPCBrokerStatus
  getMetrics(): IPCBrokerMetrics
  
  // Event streaming
  subscribeToEvents(): Stream.Stream<IPCBrokerEvent, never, never>
}

/**
 * IPC broker status
 */
export interface IPCBrokerStatus {
  readonly isRunning: boolean
  readonly channelCount: number
  readonly clientCount: number
  readonly messageQueue: number
  readonly uptime: number
  readonly lastCleanup: Date
  readonly memoryUsage: number
}

/**
 * IPC broker metrics
 */
export interface IPCBrokerMetrics {
  readonly messagesRouted: number
  readonly messagesBroadcast: number
  readonly messagesDropped: number
  readonly activeChannels: number
  readonly activeClients: number
  readonly averageLatency: number
  readonly peakConnections: number
  readonly errors: number
}

/**
 * IPC broker events
 */
export type IPCBrokerEvent = {
  readonly type: 'client_connected'
  readonly clientId: string
  readonly timestamp: Date
} | {
  readonly type: 'client_disconnected'
  readonly clientId: string
  readonly timestamp: Date
} | {
  readonly type: 'channel_created'
  readonly channelId: string
  readonly timestamp: Date
} | {
  readonly type: 'channel_destroyed'
  readonly channelId: string
  readonly timestamp: Date
} | {
  readonly type: 'message_routed'
  readonly messageId: string
  readonly timestamp: Date
} | {
  readonly type: 'error'
  readonly error: string
  readonly timestamp: Date
}

// =============================================================================
// Process-Specific IPC Types
// =============================================================================

/**
 * Process IPC message payloads
 */
export type ProcessIPCPayload = {
  readonly type: 'process_start'
  readonly command: string
  readonly args: string[]
  readonly options?: {
    readonly cwd?: string
    readonly env?: Record<string, string>
    readonly stdio?: 'inherit' | 'pipe' | 'ignore'
  }
} | {
  readonly type: 'process_stop'
  readonly pid: number
  readonly signal?: string
  readonly timeout?: number
} | {
  readonly type: 'process_restart'
  readonly pid: number
  readonly preserveEnv?: boolean
} | {
  readonly type: 'process_status'
  readonly pid?: number
  readonly name?: string
} | {
  readonly type: 'health_check'
  readonly pid: number
  readonly checkType: 'existence' | 'resources' | 'endpoint'
  readonly config?: Record<string, unknown>
} | {
  readonly type: 'metrics_request'
  readonly pid?: number
  readonly timeRange?: {
    readonly start: Date
    readonly end: Date
  }
} | {
  readonly type: 'log_message'
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly message: string
  readonly metadata?: Record<string, unknown>
}

// =============================================================================
// IPC Configuration Schema
// =============================================================================

/**
 * IPC configuration schema
 */
export const IPCConfigSchema = z.object({
  broker: z.object({
    maxChannels: z.number().min(1).max(1000).default(100),
    maxClients: z.number().min(1).max(10000).default(1000),
    messageRetention: z.number().min(1000).max(86400000).default(300000), // 5 minutes
    enablePersistence: z.boolean().default(false),
    persistencePath: z.string().optional(),
    heartbeatInterval: z.number().min(1000).max(60000).default(10000),
    cleanupInterval: z.number().min(5000).max(300000).default(30000),
    maxMessageSize: z.number().min(1024).max(10485760).default(1048576), // 1MB
    enableMetrics: z.boolean().default(true),
    enableSecurity: z.boolean().default(false),
    authenticationRequired: z.boolean().default(false),
  }).default({}),
  
  client: z.object({
    heartbeatInterval: z.number().min(1000).max(30000).default(5000),
    reconnectAttempts: z.number().min(0).max(10).default(3),
    reconnectDelay: z.number().min(1000).max(30000).default(5000),
    requestTimeout: z.number().min(1000).max(60000).default(10000),
    maxQueueSize: z.number().min(10).max(10000).default(1000),
    enablePersistence: z.boolean().default(false),
  }).default({}),
  
  channels: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['named_pipe', 'unix_socket', 'tcp_socket', 'websocket', 'memory']),
    name: z.string().min(1),
    path: z.string().optional(),
    host: z.string().optional(),
    port: z.number().min(1).max(65535).optional(),
    secure: z.boolean().default(false),
    maxConnections: z.number().min(1).max(1000).default(100),
    bufferSize: z.number().min(1024).max(1048576).default(65536),
    timeout: z.number().min(1000).max(30000).default(5000),
    persistent: z.boolean().default(true),
  })).default([]),
  
  security: z.object({
    enableAuthentication: z.boolean().default(false),
    enableEncryption: z.boolean().default(false),
    certificatePath: z.string().optional(),
    privateKeyPath: z.string().optional(),
    allowedClients: z.array(z.string()).default([]),
    rateLimiting: z.object({
      enabled: z.boolean().default(false),
      maxRequests: z.number().min(1).max(10000).default(1000),
      windowMs: z.number().min(1000).max(3600000).default(60000),
    }).default({}),
  }).default({}),
})

export type IPCConfig = z.infer<typeof IPCConfigSchema>

// =============================================================================
// IPC Error Types
// =============================================================================

/**
 * IPC connection error
 */
export class IPCConnectionError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'IPCConnectionError'
  }
}

/**
 * IPC message error
 */
export class IPCMessageError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'IPCMessageError'
  }
}

/**
 * IPC timeout error
 */
export class IPCTimeoutError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'IPCTimeoutError'
  }
}

/**
 * IPC authentication error
 */
export class IPCAuthenticationError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'IPCAuthenticationError'
  }
}

/**
 * IPC channel error
 */
export class IPCChannelError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'IPCChannelError'
  }
}
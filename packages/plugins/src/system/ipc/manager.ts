/**
 * IPC Manager Implementation
 * 
 * This module provides a high-level IPC manager that integrates with the
 * process manager and provides process-specific IPC functionality.
 * 
 * @module plugins/system/ipc/manager
 */

import { Effect, Stream, Ref } from "effect"
import { v4 as uuidv4 } from "uuid"
import { IPCMessageBroker } from "./broker"
import { IPCMessageClient } from "./client"
import {
  IPCConfig,
  IPCConfigSchema,
  IPCBroker,
  IPCClient,
  IPCMessage,
  IPCRequest,
  IPCResponse,
  IPCChannelConfig,
  IPCClientConfig,
  ProcessIPCPayload,
  IPCConnectionError,
  IPCMessageError,
} from "./types"
import type { ProcessInfo } from "../types"

// =============================================================================
// IPC Manager Types
// =============================================================================

/**
 * IPC Manager interface
 */
export interface IPCManager {
  readonly config: IPCConfig
  readonly broker: IPCBroker
  readonly isRunning: boolean
  
  // Manager lifecycle
  start(): Promise<void>
  stop(): Promise<void>
  
  // Client management
  createClient(config: IPCClientConfig): Promise<IPCClient>
  removeClient(clientId: string): Promise<void>
  getClient(clientId: string): IPCClient | undefined
  
  // Channel management
  createChannel(config: IPCChannelConfig): Promise<void>
  removeChannel(channelId: string): Promise<void>
  
  // Process communication
  sendToProcess(processId: string, message: ProcessIPCPayload): Promise<void>
  requestFromProcess(processId: string, request: ProcessIPCPayload): Promise<IPCResponse>
  broadcastToProcesses(message: ProcessIPCPayload): Promise<void>
  
  // Process registration
  registerProcess(processInfo: ProcessInfo): Promise<string>
  unregisterProcess(processId: string): Promise<void>
  
  // Event streaming
  subscribeToProcessEvents(): Stream.Stream<ProcessIPCEvent, never, never>
  subscribeToProcessMessages(processId: string): Stream.Stream<IPCMessage, never, never>
  
  // Monitoring
  getProcessConnections(): ProcessConnectionInfo[]
  getIPCMetrics(): IPCManagerMetrics
}

/**
 * Process IPC event types
 */
export type ProcessIPCEvent = {
  readonly type: 'process_registered'
  readonly processId: string
  readonly processInfo: ProcessInfo
  readonly timestamp: Date
} | {
  readonly type: 'process_unregistered'
  readonly processId: string
  readonly timestamp: Date
} | {
  readonly type: 'process_message'
  readonly processId: string
  readonly message: IPCMessage
  readonly timestamp: Date
} | {
  readonly type: 'process_disconnected'
  readonly processId: string
  readonly timestamp: Date
} | {
  readonly type: 'process_error'
  readonly processId: string
  readonly error: string
  readonly timestamp: Date
}

/**
 * Process connection information
 */
export interface ProcessConnectionInfo {
  readonly processId: string
  readonly processInfo: ProcessInfo
  readonly clientId: string
  readonly channels: string[]
  readonly connected: boolean
  readonly lastActivity: Date
  readonly messagesSent: number
  readonly messagesReceived: number
}

/**
 * IPC Manager metrics
 */
export interface IPCManagerMetrics {
  readonly connectedProcesses: number
  readonly totalChannels: number
  readonly totalMessages: number
  readonly processRegistrations: number
  readonly processUnregistrations: number
  readonly errors: number
  readonly averageLatency: number
  readonly uptime: number
}

// =============================================================================
// IPC Manager Implementation
// =============================================================================

/**
 * Production IPC Manager
 * 
 * Provides high-level IPC management integrated with process management:
 * - Broker and client lifecycle management
 * - Process-specific IPC channels
 * - Process registration and discovery
 * - Event streaming and monitoring
 * - Integration with process manager
 */
export class ProcessIPCManager implements IPCManager {
  public readonly config: IPCConfig
  public readonly broker: IPCBroker
  public isRunning: boolean = false
  
  /**
   * Client management
   */
  private readonly clients: Map<string, IPCClient> = new Map()
  private readonly processClients: Map<string, string> = new Map() // processId -> clientId
  private readonly clientProcesses: Map<string, string> = new Map() // clientId -> processId
  
  /**
   * Process tracking
   */
  private readonly processInfo: Map<string, ProcessInfo> = new Map()
  private readonly processConnections: Map<string, ProcessConnectionInfo> = new Map()
  
  /**
   * Event management
   */
  private readonly eventHandlers: Set<(event: ProcessIPCEvent) => void> = new Set()
  private readonly messageHandlers: Map<string, Set<(message: IPCMessage) => void>> = new Map()
  
  /**
   * Metrics and monitoring
   */
  private readonly metricsRef: Ref.Ref<IPCManagerMetrics>
  private readonly startTime: Date = new Date()
  
  /**
   * Constructor
   */
  constructor(config: Partial<IPCConfig> = {}) {
    this.config = IPCConfigSchema.parse(config)
    this.broker = new IPCMessageBroker(this.config.broker)
    
    // Initialize metrics ref (will be properly initialized in start())
    this.metricsRef = null as any
    
    console.log('IPC Manager created')
  }
  
  // =============================================================================
  // Manager Lifecycle
  // =============================================================================
  
  /**
   * Start the IPC manager
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new IPCConnectionError('IPC Manager is already running')
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        try {
          console.log('Starting IPC Manager...')
          
          // Initialize metrics
          this.metricsRef = yield* Ref.make<IPCManagerMetrics>({
            connectedProcesses: 0,
            totalChannels: 0,
            totalMessages: 0,
            processRegistrations: 0,
            processUnregistrations: 0,
            errors: 0,
            averageLatency: 0,
            uptime: 0
          })
          
          // Start broker
          yield* Effect.tryPromise(() => this.broker.start())
          
          // Create default channels
          yield* this.createDefaultChannels()
          
          // Set up broker event handling
          this.setupBrokerEventHandling()
          
          this.isRunning = true
          
          console.log('IPC Manager started successfully')
        } catch (error) {
          console.error('Failed to start IPC Manager:', error)
          throw new IPCConnectionError(`Failed to start IPC Manager: ${error}`)
        }
      }).bind(this))
    )
  }
  
  /**
   * Stop the IPC manager
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        try {
          console.log('Stopping IPC Manager...')
          
          this.isRunning = false
          
          // Disconnect all clients
          for (const [clientId, client] of this.clients) {
            try {
              yield* Effect.tryPromise(() => client.disconnect())
            } catch (error) {
              console.warn(`Failed to disconnect client ${clientId}:`, error)
            }
          }
          
          // Stop broker
          yield* Effect.tryPromise(() => this.broker.stop())
          
          // Clear collections
          this.clients.clear()
          this.processClients.clear()
          this.clientProcesses.clear()
          this.processInfo.clear()
          this.processConnections.clear()
          this.eventHandlers.clear()
          this.messageHandlers.clear()
          
          console.log('IPC Manager stopped successfully')
        } catch (error) {
          console.error('Error stopping IPC Manager:', error)
          throw new IPCConnectionError(`Failed to stop IPC Manager: ${error}`)
        }
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Client Management
  // =============================================================================
  
  /**
   * Create a new IPC client
   */
  public async createClient(config: IPCClientConfig): Promise<IPCClient> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        if (this.clients.has(config.id)) {
          throw new IPCConnectionError(`Client ${config.id} already exists`)
        }
        
        const client = new IPCMessageClient(config)
        
        // Register with broker
        yield* Effect.tryPromise(() => this.broker.registerClient(client))
        
        // Store client
        this.clients.set(config.id, client)
        
        // Set up client event handling
        this.setupClientEventHandling(client)
        
        console.log(`Created IPC client: ${config.id}`)
        return client
      }).bind(this))
    )
  }
  
  /**
   * Remove an IPC client
   */
  public async removeClient(clientId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const client = this.clients.get(clientId)
        if (!client) {
          throw new IPCConnectionError(`Client ${clientId} not found`)
        }
        
        // Unregister from broker
        yield* Effect.tryPromise(() => this.broker.unregisterClient(clientId))
        
        // Remove from collections
        this.clients.delete(clientId)
        
        // Clean up process mappings
        const processId = this.clientProcesses.get(clientId)
        if (processId) {
          this.processClients.delete(processId)
          this.clientProcesses.delete(clientId)
          this.processConnections.delete(processId)
        }
        
        console.log(`Removed IPC client: ${clientId}`)
      }).bind(this))
    )
  }
  
  /**
   * Get client by ID
   */
  public getClient(clientId: string): IPCClient | undefined {
    return this.clients.get(clientId)
  }
  
  // =============================================================================
  // Channel Management
  // =============================================================================
  
  /**
   * Create a new channel
   */
  public async createChannel(config: IPCChannelConfig): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        yield* Effect.tryPromise(() => this.broker.createChannel(config))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          totalChannels: this.broker.channels.size
        }))
        
        console.log(`Created IPC channel: ${config.id}`)
      }).bind(this))
    )
  }
  
  /**
   * Remove a channel
   */
  public async removeChannel(channelId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        yield* Effect.tryPromise(() => this.broker.removeChannel(channelId))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          totalChannels: this.broker.channels.size
        }))
        
        console.log(`Removed IPC channel: ${channelId}`)
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Process Communication
  // =============================================================================
  
  /**
   * Send message to a specific process
   */
  public async sendToProcess(processId: string, message: ProcessIPCPayload): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const clientId = this.processClients.get(processId)
        if (!clientId) {
          throw new IPCConnectionError(`Process ${processId} not connected`)
        }
        
        const client = this.clients.get(clientId)
        if (!client) {
          throw new IPCConnectionError(`Client for process ${processId} not found`)
        }
        
        const ipcMessage: Omit<IPCMessage, 'id' | 'timestamp' | 'senderId'> = {
          type: 'request',
          priority: 'normal',
          targetId: processId,
          channelId: 'process-channel',
          payload: message
        }
        
        yield* Effect.tryPromise(() => client.send('process-channel', ipcMessage))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          totalMessages: metrics.totalMessages + 1
        }))
        
        // Emit event
        this.emitProcessEvent({
          type: 'process_message',
          processId,
          message: {
            ...ipcMessage,
            id: uuidv4(),
            timestamp: new Date(),
            senderId: 'manager'
          },
          timestamp: new Date()
        })
        
        console.log(`Sent message to process ${processId}`)
      }).bind(this))
    )
  }
  
  /**
   * Send request to a specific process
   */
  public async requestFromProcess(processId: string, request: ProcessIPCPayload): Promise<IPCResponse> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const clientId = this.processClients.get(processId)
        if (!clientId) {
          throw new IPCConnectionError(`Process ${processId} not connected`)
        }
        
        const client = this.clients.get(clientId)
        if (!client) {
          throw new IPCConnectionError(`Client for process ${processId} not found`)
        }
        
        const ipcRequest: Omit<IPCRequest, 'id' | 'timestamp' | 'senderId'> = {
          type: 'request',
          priority: 'normal',
          targetId: processId,
          channelId: 'process-channel',
          payload: request,
          expectsResponse: true,
          timeout: 10000
        }
        
        const response = yield* Effect.tryPromise(() => client.sendRequest('process-channel', ipcRequest))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          totalMessages: metrics.totalMessages + 1
        }))
        
        console.log(`Received response from process ${processId}`)
        return response
      }).bind(this))
    )
  }
  
  /**
   * Broadcast message to all processes
   */
  public async broadcastToProcesses(message: ProcessIPCPayload): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const promises = Array.from(this.processClients.keys()).map(processId =>
          this.sendToProcess(processId, message)
        )
        
        yield* Effect.tryPromise(() => Promise.allSettled(promises))
        
        console.log(`Broadcast message to ${this.processClients.size} processes`)
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Process Registration
  // =============================================================================
  
  /**
   * Register a process for IPC
   */
  public async registerProcess(processInfo: ProcessInfo): Promise<string> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const processId = `process-${processInfo.pid}`
        
        // Store process info
        this.processInfo.set(processId, processInfo)
        
        // Create client for process
        const clientConfig: IPCClientConfig = {
          id: `client-${processId}`,
          name: `Client for ${processInfo.name}`,
          channels: ['process-channel'],
          heartbeatInterval: 5000,
          reconnectAttempts: 3,
          reconnectDelay: 2000
        }
        
        const client = yield* Effect.tryPromise(() => this.createClient(clientConfig))
        
        // Connect to process channel
        yield* Effect.tryPromise(() => client.connect('process-channel'))
        
        // Set up mappings
        this.processClients.set(processId, client.id)
        this.clientProcesses.set(client.id, processId)
        
        // Create connection info
        const connectionInfo: ProcessConnectionInfo = {
          processId,
          processInfo,
          clientId: client.id,
          channels: ['process-channel'],
          connected: true,
          lastActivity: new Date(),
          messagesSent: 0,
          messagesReceived: 0
        }
        
        this.processConnections.set(processId, connectionInfo)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          connectedProcesses: this.processClients.size,
          processRegistrations: metrics.processRegistrations + 1
        }))
        
        // Emit event
        this.emitProcessEvent({
          type: 'process_registered',
          processId,
          processInfo,
          timestamp: new Date()
        })
        
        console.log(`Registered process ${processId} (${processInfo.name})`)
        return processId
      }).bind(this))
    )
  }
  
  /**
   * Unregister a process
   */
  public async unregisterProcess(processId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: ProcessIPCManager) {
        const clientId = this.processClients.get(processId)
        if (!clientId) {
          throw new IPCConnectionError(`Process ${processId} not registered`)
        }
        
        // Remove client
        yield* Effect.tryPromise(() => this.removeClient(clientId))
        
        // Clean up process info
        this.processInfo.delete(processId)
        this.processConnections.delete(processId)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          connectedProcesses: this.processClients.size,
          processUnregistrations: metrics.processUnregistrations + 1
        }))
        
        // Emit event
        this.emitProcessEvent({
          type: 'process_unregistered',
          processId,
          timestamp: new Date()
        })
        
        console.log(`Unregistered process ${processId}`)
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Event Streaming
  // =============================================================================
  
  /**
   * Subscribe to process events
   */
  public subscribeToProcessEvents(): Stream.Stream<ProcessIPCEvent, never, never> {
    return Stream.async<ProcessIPCEvent>(emit => {
      const handler = (event: ProcessIPCEvent) => {
        emit(Effect.succeed(event))
      }
      
      this.eventHandlers.add(handler)
      
      return Effect.sync(() => {
        this.eventHandlers.delete(handler)
      })
    })
  }
  
  /**
   * Subscribe to messages from a specific process
   */
  public subscribeToProcessMessages(processId: string): Stream.Stream<IPCMessage, never, never> {
    return Stream.async<IPCMessage>(emit => {
      const handler = (message: IPCMessage) => {
        emit(Effect.succeed(message))
      }
      
      if (!this.messageHandlers.has(processId)) {
        this.messageHandlers.set(processId, new Set())
      }
      
      this.messageHandlers.get(processId)!.add(handler)
      
      return Effect.sync(() => {
        const handlers = this.messageHandlers.get(processId)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) {
            this.messageHandlers.delete(processId)
          }
        }
      })
    })
  }
  
  // =============================================================================
  // Monitoring
  // =============================================================================
  
  /**
   * Get process connections
   */
  public getProcessConnections(): ProcessConnectionInfo[] {
    return Array.from(this.processConnections.values())
  }
  
  /**
   * Get IPC metrics
   */
  public getIPCMetrics(): IPCManagerMetrics {
    if (!this.metricsRef) {
      return {
        connectedProcesses: 0,
        totalChannels: 0,
        totalMessages: 0,
        processRegistrations: 0,
        processUnregistrations: 0,
        errors: 0,
        averageLatency: 0,
        uptime: 0
      }
    }
    
    const metrics = Effect.runSync(Ref.get(this.metricsRef))
    return {
      ...metrics,
      uptime: Date.now() - this.startTime.getTime()
    }
  }
  
  // =============================================================================
  // Private Implementation Methods
  // =============================================================================
  
  /**
   * Create default channels
   */
  private createDefaultChannels(): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: ProcessIPCManager) {
      const defaultChannels = [
        {
          id: 'process-channel',
          type: 'memory' as const,
          name: 'Process Communication Channel',
          maxConnections: 1000,
          bufferSize: 65536,
          timeout: 5000,
          persistent: true
        },
        {
          id: 'health-channel',
          type: 'memory' as const,
          name: 'Health Check Channel',
          maxConnections: 100,
          bufferSize: 32768,
          timeout: 3000,
          persistent: true
        }
      ]
      
      for (const channelConfig of defaultChannels) {
        try {
          yield* Effect.tryPromise(() => this.broker.createChannel(channelConfig))
          console.log(`Created default channel: ${channelConfig.id}`)
        } catch (error) {
          console.warn(`Failed to create default channel ${channelConfig.id}:`, error)
        }
      }
    }).bind(this))
  }
  
  /**
   * Set up broker event handling
   */
  private setupBrokerEventHandling(): void {
    const eventStream = this.broker.subscribeToEvents()
    
    // Handle broker events
    Effect.runFork(
      Stream.runForEach(eventStream, event => {
        return Effect.sync(() => {
          console.log(`Broker event: ${event.type}`)
          
          // Handle specific events
          if (event.type === 'error') {
            this.updateMetrics(metrics => ({
              ...metrics,
              errors: metrics.errors + 1
            }))
          }
        })
      })
    )
  }
  
  /**
   * Set up client event handling
   */
  private setupClientEventHandling(client: IPCClient): void {
    // Handle client messages
    client.subscribe(message => {
      const processId = this.clientProcesses.get(client.id)
      if (processId) {
        this.handleProcessMessage(processId, message)
      }
    })
  }
  
  /**
   * Handle process message
   */
  private handleProcessMessage(processId: string, message: IPCMessage): void {
    // Update connection info
    const connectionInfo = this.processConnections.get(processId)
    if (connectionInfo) {
      this.processConnections.set(processId, {
        ...connectionInfo,
        lastActivity: new Date(),
        messagesReceived: connectionInfo.messagesReceived + 1
      })
    }
    
    // Emit event
    this.emitProcessEvent({
      type: 'process_message',
      processId,
      message,
      timestamp: new Date()
    })
    
    // Notify message handlers
    const handlers = this.messageHandlers.get(processId)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message)
        } catch (error) {
          console.warn(`Process message handler error:`, error)
        }
      }
    }
  }
  
  /**
   * Emit process event
   */
  private emitProcessEvent(event: ProcessIPCEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch (error) {
        console.warn(`Process event handler error:`, error)
      }
    }
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(updater: (metrics: IPCManagerMetrics) => IPCManagerMetrics): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: ProcessIPCManager) {
      const current = yield* Ref.get(this.metricsRef)
      const updated = updater(current)
      yield* Ref.set(this.metricsRef, updated)
    }).bind(this))
  }
}
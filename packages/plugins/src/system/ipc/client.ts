/**
 * IPC Client Implementation
 * 
 * This module provides an IPC client for connecting to the message broker
 * and communicating with other processes.
 * 
 * @module plugins/system/ipc/client
 */

import { Effect, Stream, Ref } from "effect"
import { v4 as uuidv4 } from "uuid"
import {
  IPCClient,
  IPCClientConfig,
  IPCClientStatus,
  IPCClientMetrics,
  IPCChannel,
  IPCMessage,
  IPCRequest,
  IPCResponse,
  IPCMessageType,
  IPCConnectionError,
  IPCTimeoutError,
  IPCMessageError,
} from "./types"

// =============================================================================
// IPC Client Implementation
// =============================================================================

/**
 * Production IPC Client
 * 
 * Provides client-side IPC functionality:
 * - Connection management with auto-reconnect
 * - Message sending and receiving
 * - Request/response pattern support
 * - Subscription management
 * - Health monitoring and metrics
 */
export class IPCMessageClient implements IPCClient {
  public readonly id: string
  public readonly config: IPCClientConfig
  public isConnected: boolean = false
  public readonly channels: Map<string, IPCChannel> = new Map()
  
  /**
   * Internal state management
   */
  private readonly metricsRef: Ref.Ref<IPCClientMetrics>
  private readonly statusRef: Ref.Ref<IPCClientStatus>
  private readonly messageQueue: Map<string, IPCMessage> = new Map()
  private readonly pendingRequests: Map<string, {
    resolve: (response: IPCResponse) => void
    reject: (error: Error) => void
    timeout: Timer
  }> = new Map()
  
  /**
   * Event handlers
   */
  private readonly globalHandlers: Set<(message: IPCMessage) => void | Promise<void>> = new Set()
  private readonly channelHandlers: Map<string, Set<(message: IPCMessage) => void | Promise<void>>> = new Map()
  private readonly typeHandlers: Map<IPCMessageType, Set<(message: IPCMessage) => void | Promise<void>>> = new Map()
  
  /**
   * Connection management
   */
  private heartbeatTimer: Timer | null = null
  private reconnectAttempts: number = 0
  private lastHeartbeat: Date = new Date()
  private readonly startTime: Date = new Date()
  
  /**
   * Constructor
   */
  constructor(config: IPCClientConfig) {
    this.id = config.id
    this.config = {
      heartbeatInterval: 5000,
      reconnectAttempts: 3,
      reconnectDelay: 5000,
      requestTimeout: 10000,
      maxQueueSize: 1000,
      enablePersistence: false,
      ...config
    }
    
    // Initialize refs (will be properly initialized in connect)
    this.metricsRef = null as any
    this.statusRef = null as any
    
    console.log(`IPC Client created: ${this.id}`)
  }
  
  // =============================================================================
  // Connection Management
  // =============================================================================
  
  /**
   * Connect to a channel
   */
  public async connect(channelId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        try {
          console.log(`Connecting to channel: ${channelId}`)
          
          // Initialize state if first connection
          if (!this.metricsRef) {
            this.metricsRef = yield* Ref.make<IPCClientMetrics>({
              messagesSent: 0,
              messagesReceived: 0,
              requestsSent: 0,
              responsesReceived: 0,
              errors: 0,
              averageLatency: 0,
              connectionAttempts: 0,
              reconnections: 0
            })
          }
          
          if (!this.statusRef) {
            this.statusRef = yield* Ref.make<IPCClientStatus>({
              id: this.id,
              connected: false,
              channels: [],
              messageQueue: 0,
              lastHeartbeat: new Date(),
              uptime: 0
            })
          }
          
          // Update connection attempt metrics
          yield* this.updateMetrics(metrics => ({
            ...metrics,
            connectionAttempts: metrics.connectionAttempts + 1
          }))
          
          // Create channel connection (simplified for now)
          const channel = yield* this.createChannelConnection(channelId)
          
          // Register channel
          this.channels.set(channelId, channel)
          
          // Set up message handling
          channel.subscribe(this.handleMessage.bind(this))
          
          // Update status
          this.isConnected = true
          this.reconnectAttempts = 0
          
          // Start heartbeat
          this.startHeartbeat()
          
          // Update status
          yield* this.updateStatus()
          
          console.log(`Connected to channel: ${channelId}`)
        } catch (error) {
          console.error(`Failed to connect to channel ${channelId}:`, error)
          
          // Update error metrics
          yield* this.updateMetrics(metrics => ({
            ...metrics,
            errors: metrics.errors + 1
          }))
          
          throw new IPCConnectionError(`Failed to connect to channel ${channelId}: ${error}`)
        }
      }).bind(this))
    )
  }
  
  /**
   * Disconnect from a channel or all channels
   */
  public async disconnect(channelId?: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        try {
          if (channelId) {
            // Disconnect from specific channel
            const channel = this.channels.get(channelId)
            if (channel) {
              yield* Effect.tryPromise(() => channel.close())
              this.channels.delete(channelId)
              console.log(`Disconnected from channel: ${channelId}`)
            }
          } else {
            // Disconnect from all channels
            for (const [id, channel] of this.channels) {
              try {
                yield* Effect.tryPromise(() => channel.close())
                console.log(`Disconnected from channel: ${id}`)
              } catch (error) {
                console.warn(`Failed to disconnect from channel ${id}:`, error)
              }
            }
            this.channels.clear()
          }
          
          // Update connection status
          this.isConnected = this.channels.size > 0
          
          // Stop heartbeat if no channels
          if (this.channels.size === 0) {
            this.stopHeartbeat()
          }
          
          // Update status
          yield* this.updateStatus()
          
          console.log(`Disconnected from ${channelId || 'all channels'}`)
        } catch (error) {
          console.error(`Failed to disconnect:`, error)
          throw new IPCConnectionError(`Failed to disconnect: ${error}`)
        }
      }).bind(this))
    )
  }
  
  /**
   * Reconnect to a channel
   */
  public async reconnect(channelId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        if (this.reconnectAttempts >= this.config.reconnectAttempts!) {
          throw new IPCConnectionError(`Max reconnection attempts exceeded for channel ${channelId}`)
        }
        
        console.log(`Reconnecting to channel: ${channelId} (attempt ${this.reconnectAttempts + 1}/${this.config.reconnectAttempts})`)
        
        // Wait before reconnecting
        yield* Effect.sleep(this.config.reconnectDelay!)
        
        // Disconnect first
        yield* Effect.tryPromise(() => this.disconnect(channelId))
        
        // Update reconnection metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          reconnections: metrics.reconnections + 1
        }))
        
        // Attempt reconnection
        this.reconnectAttempts++
        yield* Effect.tryPromise(() => this.connect(channelId))
        
        console.log(`Successfully reconnected to channel: ${channelId}`)
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Message Operations
  // =============================================================================
  
  /**
   * Send a message
   */
  public async send(channelId: string, message: Omit<IPCMessage, 'id' | 'timestamp' | 'senderId'>): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        const channel = this.channels.get(channelId)
        if (!channel) {
          throw new IPCConnectionError(`Channel ${channelId} not connected`)
        }
        
        // Create complete message
        const completeMessage: IPCMessage = {
          id: uuidv4(),
          timestamp: new Date(),
          senderId: this.id,
          ...message
        }
        
        // Send message
        yield* Effect.tryPromise(() => channel.send(completeMessage))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          messagesSent: metrics.messagesSent + 1
        }))
        
        console.log(`Sent message ${completeMessage.id} to channel ${channelId}`)
      }).bind(this))
    )
  }
  
  /**
   * Send a request and wait for response
   */
  public async sendRequest(channelId: string, request: Omit<IPCRequest, 'id' | 'timestamp' | 'senderId'>): Promise<IPCResponse> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        const channel = this.channels.get(channelId)
        if (!channel) {
          throw new IPCConnectionError(`Channel ${channelId} not connected`)
        }
        
        // Create complete request
        const completeRequest: IPCRequest = {
          id: uuidv4(),
          timestamp: new Date(),
          senderId: this.id,
          type: 'request',
          expectsResponse: true,
          timeout: request.timeout || this.config.requestTimeout,
          ...request
        }
        
        // Set up response promise
        const responsePromise = new Promise<IPCResponse>((resolve, reject) => {
          // Set up timeout
          const timeout = setTimeout(() => {
            this.pendingRequests.delete(completeRequest.id)
            reject(new IPCTimeoutError(`Request ${completeRequest.id} timed out`))
          }, completeRequest.timeout!)
          
          // Store pending request
          this.pendingRequests.set(completeRequest.id, {
            resolve,
            reject,
            timeout
          })
        })
        
        // Send request
        yield* Effect.tryPromise(() => channel.sendRequest(completeRequest))
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          requestsSent: metrics.requestsSent + 1
        }))
        
        // Wait for response
        const response = yield* Effect.tryPromise(() => responsePromise)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          responsesReceived: metrics.responsesReceived + 1
        }))
        
        console.log(`Received response ${response.id} for request ${completeRequest.id}`)
        return response
      }).bind(this))
    )
  }
  
  /**
   * Broadcast a message to all channels
   */
  public async broadcast(message: Omit<IPCMessage, 'id' | 'timestamp' | 'senderId' | 'targetId'>): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageClient) {
        const promises = Array.from(this.channels.keys()).map(channelId =>
          this.send(channelId, message)
        )
        
        yield* Effect.tryPromise(() => Promise.all(promises))
        
        console.log(`Broadcast message to ${this.channels.size} channels`)
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Subscription Management
  // =============================================================================
  
  /**
   * Subscribe to all messages
   */
  public subscribe(handler: (message: IPCMessage) => void | Promise<void>): () => void {
    this.globalHandlers.add(handler)
    return () => this.globalHandlers.delete(handler)
  }
  
  /**
   * Subscribe to messages from a specific channel
   */
  public subscribeToChannel(channelId: string, handler: (message: IPCMessage) => void | Promise<void>): () => void {
    if (!this.channelHandlers.has(channelId)) {
      this.channelHandlers.set(channelId, new Set())
    }
    
    this.channelHandlers.get(channelId)!.add(handler)
    
    return () => {
      const handlers = this.channelHandlers.get(channelId)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.channelHandlers.delete(channelId)
        }
      }
    }
  }
  
  /**
   * Subscribe to messages of a specific type
   */
  public subscribeToType(type: IPCMessageType, handler: (message: IPCMessage) => void | Promise<void>): () => void {
    if (!this.typeHandlers.has(type)) {
      this.typeHandlers.set(type, new Set())
    }
    
    this.typeHandlers.get(type)!.add(handler)
    
    return () => {
      const handlers = this.typeHandlers.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.typeHandlers.delete(type)
        }
      }
    }
  }
  
  // =============================================================================
  // Health and Monitoring
  // =============================================================================
  
  /**
   * Ping target or all connections
   */
  public async ping(targetId?: string): Promise<number> {
    const startTime = Date.now()
    
    try {
      // For now, simulate ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      
      const latency = Date.now() - startTime
      
      // Update metrics
      if (this.metricsRef) {
        Effect.runSync(
          this.updateMetrics(metrics => ({
            ...metrics,
            averageLatency: (metrics.averageLatency * 0.9) + (latency * 0.1) // Exponential moving average
          }))
        )
      }
      
      return latency
    } catch (error) {
      console.error(`Ping failed:`, error)
      throw new IPCConnectionError(`Ping failed: ${error}`)
    }
  }
  
  /**
   * Get client status
   */
  public getStatus(): IPCClientStatus {
    if (!this.statusRef) {
      return {
        id: this.id,
        connected: false,
        channels: [],
        messageQueue: 0,
        lastHeartbeat: new Date(),
        uptime: 0
      }
    }
    
    return Effect.runSync(Ref.get(this.statusRef))
  }
  
  /**
   * Get client metrics
   */
  public getMetrics(): IPCClientMetrics {
    if (!this.metricsRef) {
      return {
        messagesSent: 0,
        messagesReceived: 0,
        requestsSent: 0,
        responsesReceived: 0,
        errors: 0,
        averageLatency: 0,
        connectionAttempts: 0,
        reconnections: 0
      }
    }
    
    return Effect.runSync(Ref.get(this.metricsRef))
  }
  
  // =============================================================================
  // Private Implementation Methods
  // =============================================================================
  
  /**
   * Create channel connection
   */
  private createChannelConnection(channelId: string): Effect.Effect<IPCChannel, IPCConnectionError, never> {
    return Effect.sync(() => {
      // For now, create a simple mock channel
      return new MockChannel(channelId)
    })
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(message: IPCMessage): Promise<void> {
    try {
      // Update metrics
      if (this.metricsRef) {
        Effect.runSync(
          this.updateMetrics(metrics => ({
            ...metrics,
            messagesReceived: metrics.messagesReceived + 1
          }))
        )
      }
      
      // Handle responses
      if (message.type === 'response') {
        const response = message as IPCResponse
        const pending = this.pendingRequests.get(response.requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(response.requestId)
          pending.resolve(response)
          return
        }
      }
      
      // Notify global handlers
      for (const handler of this.globalHandlers) {
        try {
          await handler(message)
        } catch (error) {
          console.warn(`Global handler error:`, error)
        }
      }
      
      // Notify channel handlers
      const channelHandlers = this.channelHandlers.get(message.channelId)
      if (channelHandlers) {
        for (const handler of channelHandlers) {
          try {
            await handler(message)
          } catch (error) {
            console.warn(`Channel handler error:`, error)
          }
        }
      }
      
      // Notify type handlers
      const typeHandlers = this.typeHandlers.get(message.type)
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          try {
            await handler(message)
          } catch (error) {
            console.warn(`Type handler error:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`Message handling error:`, error)
      
      // Update error metrics
      if (this.metricsRef) {
        Effect.runSync(
          this.updateMetrics(metrics => ({
            ...metrics,
            errors: metrics.errors + 1
          }))
        )
      }
    }
  }
  
  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return
    
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat()
    }, this.config.heartbeatInterval!)
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  /**
   * Perform heartbeat
   */
  private performHeartbeat(): void {
    this.lastHeartbeat = new Date()
    
    // Update status
    if (this.statusRef) {
      Effect.runSync(this.updateStatus())
    }
    
    // Send ping if configured
    this.ping().catch(error => {
      console.warn(`Heartbeat ping failed:`, error)
    })
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(updater: (metrics: IPCClientMetrics) => IPCClientMetrics): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: IPCMessageClient) {
      const current = yield* Ref.get(this.metricsRef)
      const updated = updater(current)
      yield* Ref.set(this.metricsRef, updated)
    }).bind(this))
  }
  
  /**
   * Update status
   */
  private updateStatus(): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: IPCMessageClient) {
      const status: IPCClientStatus = {
        id: this.id,
        connected: this.isConnected,
        channels: Array.from(this.channels.entries()).map(([id, channel]) => ({
          id,
          connected: channel.isOpen,
          lastActivity: new Date()
        })),
        messageQueue: this.messageQueue.size,
        lastHeartbeat: this.lastHeartbeat,
        uptime: Date.now() - this.startTime.getTime()
      }
      
      yield* Ref.set(this.statusRef, status)
    }).bind(this))
  }
}

// =============================================================================
// Mock Channel for Testing
// =============================================================================

/**
 * Mock channel for testing and development
 */
class MockChannel implements IPCChannel {
  public readonly id: string
  public readonly config: IPCChannelConfig
  public isOpen: boolean = false
  public connectionCount: number = 0
  
  private readonly handlers: Set<(message: IPCMessage) => void | Promise<void>> = new Set()
  
  constructor(channelId: string) {
    this.id = channelId
    this.config = {
      id: channelId,
      type: 'memory',
      name: `mock-${channelId}`,
      maxConnections: 10,
      bufferSize: 65536,
      timeout: 5000,
      persistent: false
    }
  }
  
  public async open(): Promise<void> {
    this.isOpen = true
    this.connectionCount = 1
    console.log(`Mock channel ${this.id} opened`)
  }
  
  public async close(): Promise<void> {
    this.isOpen = false
    this.connectionCount = 0
    this.handlers.clear()
    console.log(`Mock channel ${this.id} closed`)
  }
  
  public async send(message: IPCMessage): Promise<void> {
    if (!this.isOpen) {
      throw new IPCConnectionError('Channel is not open')
    }
    
    // Notify handlers
    for (const handler of this.handlers) {
      try {
        await handler(message)
      } catch (error) {
        console.warn(`Handler error:`, error)
      }
    }
  }
  
  public async sendRequest(request: IPCRequest): Promise<IPCResponse> {
    if (!this.isOpen) {
      throw new IPCConnectionError('Channel is not open')
    }
    
    // Simulate response
    const response: IPCResponse = {
      id: uuidv4(),
      type: 'response',
      timestamp: new Date(),
      priority: request.priority,
      senderId: 'mock-channel',
      channelId: this.id,
      payload: { status: 'ok' },
      requestId: request.id,
      success: true
    }
    
    return response
  }
  
  public async broadcast(message: IPCMessage): Promise<void> {
    await this.send(message)
  }
  
  public subscribe(handler: (message: IPCMessage) => void | Promise<void>): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
  
  public subscribeToType(type: IPCMessageType, handler: (message: IPCMessage) => void | Promise<void>): () => void {
    return this.subscribe(handler)
  }
  
  public getConnections(): string[] {
    return this.isOpen ? ['mock-connection'] : []
  }
  
  public isConnected(clientId: string): boolean {
    return this.isOpen && clientId === 'mock-connection'
  }
}
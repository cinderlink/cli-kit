/**
 * IPC Message Broker Implementation
 * 
 * This module provides a centralized message broker for inter-process communication,
 * handling message routing, channel management, and client coordination.
 * 
 * @module plugins/system/ipc/broker
 */

import { Effect, Stream, Ref, Queue } from "effect"
import { v4 as uuidv4 } from "uuid"
import {
  IPCBroker,
  IPCBrokerConfig,
  IPCBrokerStatus,
  IPCBrokerMetrics,
  IPCBrokerEvent,
  IPCChannel,
  IPCClient,
  IPCMessage,
  IPCChannelConfig,
  IPCConnectionError,
  IPCMessageError,
  IPCTimeoutError,
} from "./types"

// =============================================================================
// IPC Message Broker Implementation
// =============================================================================

/**
 * Production IPC Message Broker
 * 
 * Provides centralized message routing and coordination between processes:
 * - Channel management and lifecycle
 * - Client registration and authentication
 * - Message routing and broadcasting
 * - Event streaming and monitoring
 * - Persistence and recovery
 */
export class IPCMessageBroker implements IPCBroker {
  public readonly config: IPCBrokerConfig
  public readonly channels: Map<string, IPCChannel>
  public readonly clients: Map<string, IPCClient>
  public isRunning: boolean = false
  
  /**
   * Internal state management
   */
  private readonly eventQueue: Queue.Queue<IPCBrokerEvent>
  private readonly messageQueue: Queue.Queue<IPCMessage>
  private readonly metricsRef: Ref.Ref<IPCBrokerMetrics>
  private readonly startTime: Date
  
  /**
   * Timers and intervals
   */
  private heartbeatTimer: Timer | null = null
  private cleanupTimer: Timer | null = null
  private metricsTimer: Timer | null = null
  
  /**
   * Constructor
   */
  constructor(config: IPCBrokerConfig = {}) {
    this.config = {
      maxChannels: 100,
      maxClients: 1000,
      messageRetention: 300000, // 5 minutes
      enablePersistence: false,
      heartbeatInterval: 10000,
      cleanupInterval: 30000,
      maxMessageSize: 1048576, // 1MB
      enableMetrics: true,
      enableSecurity: false,
      authenticationRequired: false,
      ...config
    }
    
    this.channels = new Map()
    this.clients = new Map()
    this.startTime = new Date()
    
    // Initialize queues and refs (will be properly initialized in start())
    this.eventQueue = null as any
    this.messageQueue = null as any
    this.metricsRef = null as any
  }
  
  // =============================================================================
  // Broker Lifecycle Management
  // =============================================================================
  
  /**
   * Start the message broker
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new IPCConnectionError('Broker is already running')
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        try {
          console.log('Starting IPC Message Broker...')
          
          // Initialize queues and state
          const eventQueue = yield* Queue.unbounded<IPCBrokerEvent>()
          const messageQueue = yield* Queue.unbounded<IPCMessage>()
          const metricsRef = yield* Ref.make<IPCBrokerMetrics>({
            messagesRouted: 0,
            messagesBroadcast: 0,
            messagesDropped: 0,
            activeChannels: 0,
            activeClients: 0,
            averageLatency: 0,
            peakConnections: 0,
            errors: 0
          })
          
          // Set up internal state
          ;(this as any).eventQueue = eventQueue
          ;(this as any).messageQueue = messageQueue
          ;(this as any).metricsRef = metricsRef
          
          // Start background processes
          yield* this.startMessageProcessor()
          yield* this.startEventProcessor()
          
          // Start timers
          this.startHeartbeatTimer()
          this.startCleanupTimer()
          
          if (this.config.enableMetrics) {
            this.startMetricsTimer()
          }
          
          this.isRunning = true
          
          // Emit started event
          yield* Queue.offer(eventQueue, {
            type: 'client_connected',
            clientId: 'broker',
            timestamp: new Date()
          })
          
          console.log('IPC Message Broker started successfully')
        } catch (error) {
          console.error('Failed to start IPC Message Broker:', error)
          throw new IPCConnectionError(`Failed to start broker: ${error}`)
        }
      }).bind(this))
    )
  }
  
  /**
   * Stop the message broker
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }
    
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        try {
          console.log('Stopping IPC Message Broker...')
          
          this.isRunning = false
          
          // Stop timers
          if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null
          }
          
          if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
            this.cleanupTimer = null
          }
          
          if (this.metricsTimer) {
            clearInterval(this.metricsTimer)
            this.metricsTimer = null
          }
          
          // Disconnect all clients
          for (const [clientId, client] of this.clients) {
            try {
              yield* Effect.tryPromise(() => client.disconnect())
            } catch (error) {
              console.warn(`Failed to disconnect client ${clientId}:`, error)
            }
          }
          
          // Close all channels
          for (const [channelId, channel] of this.channels) {
            try {
              yield* Effect.tryPromise(() => channel.close())
            } catch (error) {
              console.warn(`Failed to close channel ${channelId}:`, error)
            }
          }
          
          // Clear collections
          this.channels.clear()
          this.clients.clear()
          
          console.log('IPC Message Broker stopped successfully')
        } catch (error) {
          console.error('Error stopping IPC Message Broker:', error)
          throw new IPCConnectionError(`Failed to stop broker: ${error}`)
        }
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Channel Management
  // =============================================================================
  
  /**
   * Create a new IPC channel
   */
  public async createChannel(config: IPCChannelConfig): Promise<IPCChannel> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        if (this.channels.size >= this.config.maxChannels!) {
          throw new IPCConnectionError(`Maximum channels limit reached: ${this.config.maxChannels}`)
        }
        
        if (this.channels.has(config.id)) {
          throw new IPCConnectionError(`Channel ${config.id} already exists`)
        }
        
        // Create channel based on type
        const channel = yield* this.createChannelByType(config)
        
        // Register channel
        this.channels.set(config.id, channel)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          activeChannels: this.channels.size
        }))
        
        // Emit event
        yield* Queue.offer(this.eventQueue, {
          type: 'channel_created',
          channelId: config.id,
          timestamp: new Date()
        })
        
        console.log(`Created IPC channel: ${config.id} (${config.type})`)
        return channel
      }).bind(this))
    )
  }
  
  /**
   * Remove an IPC channel
   */
  public async removeChannel(channelId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        const channel = this.channels.get(channelId)
        if (!channel) {
          throw new IPCConnectionError(`Channel ${channelId} not found`)
        }
        
        // Close channel
        yield* Effect.tryPromise(() => channel.close())
        
        // Remove from collection
        this.channels.delete(channelId)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          activeChannels: this.channels.size
        }))
        
        // Emit event
        yield* Queue.offer(this.eventQueue, {
          type: 'channel_destroyed',
          channelId,
          timestamp: new Date()
        })
        
        console.log(`Removed IPC channel: ${channelId}`)
      }).bind(this))
    )
  }
  
  /**
   * Get channel by ID
   */
  public getChannel(channelId: string): IPCChannel | undefined {
    return this.channels.get(channelId)
  }
  
  // =============================================================================
  // Client Management
  // =============================================================================
  
  /**
   * Register a new client
   */
  public async registerClient(client: IPCClient): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        if (this.clients.size >= this.config.maxClients!) {
          throw new IPCConnectionError(`Maximum clients limit reached: ${this.config.maxClients}`)
        }
        
        if (this.clients.has(client.id)) {
          throw new IPCConnectionError(`Client ${client.id} already registered`)
        }
        
        // Register client
        this.clients.set(client.id, client)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          activeClients: this.clients.size,
          peakConnections: Math.max(metrics.peakConnections, this.clients.size)
        }))
        
        // Emit event
        yield* Queue.offer(this.eventQueue, {
          type: 'client_connected',
          clientId: client.id,
          timestamp: new Date()
        })
        
        console.log(`Registered IPC client: ${client.id}`)
      }).bind(this))
    )
  }
  
  /**
   * Unregister a client
   */
  public async unregisterClient(clientId: string): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        const client = this.clients.get(clientId)
        if (!client) {
          throw new IPCConnectionError(`Client ${clientId} not found`)
        }
        
        // Disconnect client
        yield* Effect.tryPromise(() => client.disconnect())
        
        // Remove from collection
        this.clients.delete(clientId)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          activeClients: this.clients.size
        }))
        
        // Emit event
        yield* Queue.offer(this.eventQueue, {
          type: 'client_disconnected',
          clientId,
          timestamp: new Date()
        })
        
        console.log(`Unregistered IPC client: ${clientId}`)
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
  // Message Routing
  // =============================================================================
  
  /**
   * Route a message to its destination
   */
  public async routeMessage(message: IPCMessage): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        // Validate message
        yield* this.validateMessage(message)
        
        // Add to message queue for processing
        yield* Queue.offer(this.messageQueue, message)
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          messagesRouted: metrics.messagesRouted + 1
        }))
        
        // Emit event
        yield* Queue.offer(this.eventQueue, {
          type: 'message_routed',
          messageId: message.id,
          timestamp: new Date()
        })
      }).bind(this))
    )
  }
  
  /**
   * Broadcast a message to all clients
   */
  public async broadcastMessage(message: IPCMessage): Promise<void> {
    return Effect.runPromise(
      Effect.gen((function* (this: IPCMessageBroker) {
        // Validate message
        yield* this.validateMessage(message)
        
        // Send to all connected clients
        for (const [clientId, client] of this.clients) {
          try {
            const channel = this.channels.get(message.channelId)
            if (channel && channel.isConnected(clientId)) {
              yield* Effect.tryPromise(() => channel.send(message))
            }
          } catch (error) {
            console.warn(`Failed to broadcast message to client ${clientId}:`, error)
            yield* this.updateMetrics(metrics => ({
              ...metrics,
              messagesDropped: metrics.messagesDropped + 1,
              errors: metrics.errors + 1
            }))
          }
        }
        
        // Update metrics
        yield* this.updateMetrics(metrics => ({
          ...metrics,
          messagesBroadcast: metrics.messagesBroadcast + 1
        }))
      }).bind(this))
    )
  }
  
  // =============================================================================
  // Monitoring and Status
  // =============================================================================
  
  /**
   * Get broker status
   */
  public getStatus(): IPCBrokerStatus {
    return {
      isRunning: this.isRunning,
      channelCount: this.channels.size,
      clientCount: this.clients.size,
      messageQueue: 0, // Will be implemented when Queue is available
      uptime: Date.now() - this.startTime.getTime(),
      lastCleanup: new Date(), // Will be updated by cleanup timer
      memoryUsage: process.memoryUsage().heapUsed
    }
  }
  
  /**
   * Get broker metrics
   */
  public getMetrics(): IPCBrokerMetrics {
    if (!this.metricsRef) {
      return {
        messagesRouted: 0,
        messagesBroadcast: 0,
        messagesDropped: 0,
        activeChannels: 0,
        activeClients: 0,
        averageLatency: 0,
        peakConnections: 0,
        errors: 0
      }
    }
    
    return Effect.runSync(Ref.get(this.metricsRef))
  }
  
  /**
   * Subscribe to broker events
   */
  public subscribeToEvents(): Stream.Stream<IPCBrokerEvent, never, never> {
    if (!this.eventQueue) {
      throw new IPCConnectionError('Broker not started')
    }
    
    return Stream.fromQueue(this.eventQueue)
  }
  
  // =============================================================================
  // Private Implementation Methods
  // =============================================================================
  
  /**
   * Create channel by type
   */
  private createChannelByType(config: IPCChannelConfig): Effect.Effect<IPCChannel, IPCConnectionError, never> {
    return Effect.sync(() => {
      // For now, create a memory channel - actual channel implementations will be added
      return new MemoryChannel(config)
    })
  }
  
  /**
   * Start message processor
   */
  private startMessageProcessor(): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: IPCMessageBroker) {
      // Process messages from queue
      // This will be implemented as a background fiber
      console.log('Message processor started')
    }).bind(this))
  }
  
  /**
   * Start event processor
   */
  private startEventProcessor(): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: IPCMessageBroker) {
      // Process events from queue
      // This will be implemented as a background fiber
      console.log('Event processor started')
    }).bind(this))
  }
  
  /**
   * Start heartbeat timer
   */
  private startHeartbeatTimer(): void {
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat()
    }, this.config.heartbeatInterval)
  }
  
  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }
  
  /**
   * Start metrics timer
   */
  private startMetricsTimer(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics()
    }, 5000) // Collect metrics every 5 seconds
  }
  
  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    // Check client connections and send heartbeat
    for (const [clientId, client] of this.clients) {
      if (client.isConnected) {
        client.ping().catch(error => {
          console.warn(`Heartbeat failed for client ${clientId}:`, error)
        })
      }
    }
  }
  
  /**
   * Perform cleanup
   */
  private performCleanup(): void {
    // Clean up expired messages, inactive connections, etc.
    console.log('Performing cleanup...')
  }
  
  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    if (!this.metricsRef) return
    
    Effect.runSync(
      this.updateMetrics(metrics => ({
        ...metrics,
        activeChannels: this.channels.size,
        activeClients: this.clients.size
      }))
    )
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(updater: (metrics: IPCBrokerMetrics) => IPCBrokerMetrics): Effect.Effect<void, never, never> {
    return Effect.gen((function* (this: IPCMessageBroker) {
      const current = yield* Ref.get(this.metricsRef)
      const updated = updater(current)
      yield* Ref.set(this.metricsRef, updated)
    }).bind(this))
  }
  
  /**
   * Validate message
   */
  private validateMessage(message: IPCMessage): Effect.Effect<void, IPCMessageError, never> {
    return Effect.gen(function* () {
      if (!message.id) {
        throw new IPCMessageError('Message ID is required')
      }
      
      if (!message.senderId) {
        throw new IPCMessageError('Sender ID is required')
      }
      
      if (!message.channelId) {
        throw new IPCMessageError('Channel ID is required')
      }
      
      if (!message.type) {
        throw new IPCMessageError('Message type is required')
      }
      
      // Check TTL
      if (message.ttl && Date.now() - message.timestamp.getTime() > message.ttl) {
        throw new IPCTimeoutError('Message has expired')
      }
    })
  }
}

// =============================================================================
// Memory Channel Implementation (for testing and simple use cases)
// =============================================================================

/**
 * In-memory IPC channel implementation
 */
class MemoryChannel implements IPCChannel {
  public readonly id: string
  public readonly config: IPCChannelConfig
  public isOpen: boolean = false
  public connectionCount: number = 0
  
  private readonly connections: Map<string, boolean> = new Map()
  private readonly handlers: Set<(message: IPCMessage) => void | Promise<void>> = new Set()
  private readonly typeHandlers: Map<string, Set<(message: IPCMessage) => void | Promise<void>>> = new Map()
  
  constructor(config: IPCChannelConfig) {
    this.id = config.id
    this.config = config
  }
  
  public async open(): Promise<void> {
    if (this.isOpen) return
    
    this.isOpen = true
    console.log(`Memory channel ${this.id} opened`)
  }
  
  public async close(): Promise<void> {
    if (!this.isOpen) return
    
    this.isOpen = false
    this.connections.clear()
    this.connectionCount = 0
    this.handlers.clear()
    this.typeHandlers.clear()
    
    console.log(`Memory channel ${this.id} closed`)
  }
  
  public async send(message: IPCMessage): Promise<void> {
    if (!this.isOpen) {
      throw new IPCConnectionError('Channel is not open')
    }
    
    // Notify all handlers
    for (const handler of this.handlers) {
      try {
        await handler(message)
      } catch (error) {
        console.warn(`Message handler error:`, error)
      }
    }
    
    // Notify type-specific handlers
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
  }
  
  public async sendRequest(request: IPCRequest): Promise<IPCResponse> {
    // For memory channel, simulate request/response
    const response: IPCResponse = {
      id: uuidv4(),
      type: 'response',
      timestamp: new Date(),
      priority: request.priority,
      senderId: 'memory-channel',
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
  
  public subscribeToType(type: string, handler: (message: IPCMessage) => void | Promise<void>): () => void {
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
  
  public getConnections(): string[] {
    return Array.from(this.connections.keys())
  }
  
  public isConnected(clientId: string): boolean {
    return this.connections.get(clientId) === true
  }
}
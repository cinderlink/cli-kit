/**
 * LogViewer Kitchen Sink Demo
 * 
 * Demonstrates all LogViewer features including:
 * - Virtual scrolling with large datasets
 * - Real-time log streaming
 * - Syntax highlighting for various formats
 * - Search and filtering
 * - Log analysis and pattern detection
 * - Memory-efficient buffer management
 */

import { Effect, Stream } from "effect"
import { LogViewer, createLogViewer } from "../log-viewer"
import { LogStreamManager, createLogStreamManager } from "../log-stream"
import { createLogAnalyzer } from "../log-analysis"
import { createSyntaxHighlighter } from "../log-syntax"
import type { LogEntry, LogLevelString } from "../types"

/**
 * Generate realistic sample log data
 */
function generateSampleLogs(count: number): LogEntry[] {
  const levels: LogLevelString[] = ['debug', 'info', 'warn', 'error', 'fatal']
  const services = ['auth-service', 'api-gateway', 'user-service', 'payment-service', 'notification-service']
  const users = ['user_123', 'user_456', 'user_789', 'admin', 'system']
  
  const logTemplates = [
    // Plain text logs
    'Application {service} started successfully on port {port}',
    'Processing {method} request for {endpoint}',
    'User {user} authenticated successfully',
    'Database connection established to {database}',
    'Cache {operation} for key: {key}',
    'Background job {job_name} scheduled for {timestamp}',
    'Service health check {status}',
    'Memory usage: {percentage}% ({used}MB/{total}MB)',
    'File {filename} uploaded successfully ({size}MB)',
    'Rate limit exceeded for user {user} on endpoint {endpoint}',
    
    // JSON logs
    '{"event": "user_login", "userId": "{user_id}", "ip": "{ip}", "timestamp": "{timestamp}", "success": {success}}',
    '{"level": "info", "service": "{service}", "message": "Request processed", "duration": {duration}, "status": {status}}',
    '{"error": "Database timeout", "query": "SELECT * FROM users", "duration": {duration}, "retries": {retries}}',
    '{"event": "payment_processed", "amount": {amount}, "currency": "USD", "merchant": "{merchant}", "status": "success"}',
    
    // Error logs with stack traces
    'Error: {error_message}\n  at {function} ({file}:{line}:{column})\n  at Object.{method} ({file}:{line}:{column})\n  at require (internal/modules/cjs/loader.js:985:16)',
    'TypeError: Cannot read property {property} of undefined\n  at {function} ({file}:{line}:{column})\n  at {caller} ({file}:{line}:{column})',
    
    // SQL logs
    'SELECT * FROM users WHERE active = true AND created_at > {timestamp}',
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ({user_id}, {token}, {expires_at})',
    'UPDATE user_preferences SET theme = {theme} WHERE user_id = {user_id}',
    'DELETE FROM expired_tokens WHERE expires_at < {timestamp}',
    
    // HTTP logs
    '{ip} - - [{timestamp}] "GET {endpoint} HTTP/1.1" {status} {size}',
    '{ip} - - [{timestamp}] "POST {endpoint} HTTP/1.1" {status} {size}',
    
    // Docker/Container logs
    'Container {container_id} started with image {image}:{tag}',
    'Pulling image {image}:{tag} from registry {registry}',
    'Container {container_id} exited with status {exit_code}',
    
    // Performance logs
    'Request to {endpoint} completed in {duration}ms',
    'Database query took {duration}ms: {query}',
    'Cache hit for key {key} in {duration}ms',
    'GC performed: {gc_type}, duration: {duration}ms, memory freed: {memory}MB'
  ]

  return Array.from({ length: count }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)]
    const template = logTemplates[Math.floor(Math.random() * logTemplates.length)]
    const service = services[Math.floor(Math.random() * services.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    
    // Replace template variables
    let message = template
      .replace(/{service}/g, service)
      .replace(/{user}/g, user)
      .replace(/{user_id}/g, Math.floor(Math.random() * 1000).toString())
      .replace(/{port}/g, (3000 + Math.floor(Math.random() * 100)).toString())
      .replace(/{method}/g, ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)])
      .replace(/{endpoint}/g, ['/api/users', '/api/orders', '/api/payments', '/api/auth'][Math.floor(Math.random() * 4)])
      .replace(/{database}/g, ['postgres://localhost:5432/app', 'redis://localhost:6379'][Math.floor(Math.random() * 2)])
      .replace(/{operation}/g, ['hit', 'miss', 'set', 'delete'][Math.floor(Math.random() * 4)])
      .replace(/{key}/g, `session_${Math.random().toString(36).substr(2, 9)}`)
      .replace(/{job_name}/g, ['email_sender', 'report_generator', 'data_cleanup'][Math.floor(Math.random() * 3)])
      .replace(/{status}/g, ['passed', 'failed'][Math.floor(Math.random() * 2)])
      .replace(/{percentage}/g, Math.floor(Math.random() * 100).toString())
      .replace(/{used}/g, Math.floor(Math.random() * 1000).toString())
      .replace(/{total}/g, '1024')
      .replace(/{filename}/g, ['document.pdf', 'image.jpg', 'data.csv'][Math.floor(Math.random() * 3)])
      .replace(/{size}/g, (Math.random() * 10).toFixed(1))
      .replace(/{ip}/g, `192.168.1.${Math.floor(Math.random() * 255)}`)
      .replace(/{timestamp}/g, new Date(Date.now() - Math.random() * 86400000).toISOString())
      .replace(/{success}/g, Math.random() > 0.1 ? 'true' : 'false')
      .replace(/{duration}/g, Math.floor(Math.random() * 1000).toString())
      .replace(/{amount}/g, (Math.random() * 1000).toFixed(2))
      .replace(/{merchant}/g, ['amazon', 'stripe', 'paypal'][Math.floor(Math.random() * 3)])
      .replace(/{error_message}/g, ['Connection timeout', 'Invalid parameter', 'Resource not found'][Math.floor(Math.random() * 3)])
      .replace(/{function}/g, ['processRequest', 'validateUser', 'executeQuery'][Math.floor(Math.random() * 3)])
      .replace(/{file}/g, ['/app/src/index.js', '/app/src/auth.js', '/app/src/db.js'][Math.floor(Math.random() * 3)])
      .replace(/{line}/g, Math.floor(Math.random() * 200).toString())
      .replace(/{column}/g, Math.floor(Math.random() * 50).toString())
      .replace(/{method}/g, ['authenticate', 'authorize', 'validate'][Math.floor(Math.random() * 3)])
      .replace(/{property}/g, ['id', 'name', 'email'][Math.floor(Math.random() * 3)])
      .replace(/{caller}/g, ['middleware', 'controller', 'service'][Math.floor(Math.random() * 3)])
      .replace(/{theme}/g, ['dark', 'light'][Math.floor(Math.random() * 2)])
      .replace(/{token}/g, Math.random().toString(36).substr(2, 32))
      .replace(/{expires_at}/g, new Date(Date.now() + 86400000).toISOString())
      .replace(/{container_id}/g, Math.random().toString(36).substr(2, 12))
      .replace(/{image}/g, ['nginx', 'postgres', 'redis'][Math.floor(Math.random() * 3)])
      .replace(/{tag}/g, ['latest', 'v1.2.3', 'alpine'][Math.floor(Math.random() * 3)])
      .replace(/{registry}/g, 'docker.io')
      .replace(/{exit_code}/g, Math.random() > 0.9 ? '1' : '0')
      .replace(/{query}/g, 'SELECT * FROM users WHERE active = true')
      .replace(/{gc_type}/g, ['minor', 'major'][Math.floor(Math.random() * 2)])
      .replace(/{memory}/g, Math.floor(Math.random() * 100).toString())

    return {
      level,
      message,
      timestamp: new Date(Date.now() - (count - i) * 100 + Math.random() * 50), // Slightly randomized chronological order
      metadata: {
        service,
        requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
        userId: Math.random() > 0.3 ? Math.floor(Math.random() * 1000) : undefined,
        duration: Math.floor(Math.random() * 1000),
        component: 'log-demo'
      },
      ...(level === 'error' || level === 'fatal' ? {
        error: {
          name: 'DemoError',
          message: 'This is a demo error',
          stack: message.includes('\n') ? message : undefined
        }
      } : {})
    }
  })
}

/**
 * Demo application class
 */
export class LogViewerDemo {
  private viewer: LogViewer
  private streamManager: LogStreamManager
  private analyzer = createLogAnalyzer()
  private isStreaming = false
  private streamController?: AbortController

  constructor() {
    this.viewer = new LogViewer()
    this.streamManager = createLogStreamManager({
      maxBufferSize: 50000,
      batchSize: 100,
      batchInterval: 100,
      enableBackpressure: true
    })
  }

  /**
   * Initialize the demo with sample data
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing LogViewer Demo...')
    
    // Generate initial sample logs
    const initialLogs = generateSampleLogs(1000)
    console.log(`📝 Generated ${initialLogs.length} sample log entries`)
    
    // Initialize the viewer
    await Effect.runPromise(this.viewer.init({
      logs: initialLogs,
      followMode: true,
      searchable: true,
      syntaxTheme: 'dark',
      maxBufferSize: 50000,
      height: 600,
      lineHeight: 18
    }))
    
    console.log('✅ LogViewer initialized successfully')
    
    // Perform initial analysis
    await this.performAnalysis()
  }

  /**
   * Start real-time log streaming simulation
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.log('⚠️ Streaming already active')
      return
    }

    console.log('🔄 Starting log stream simulation...')
    this.isStreaming = true
    this.streamController = new AbortController()

    // Create a test stream with realistic frequency
    const testStream = LogStreamManager.createTestStream(20, 300000) // 20 logs/sec for 5 minutes
    
    try {
      await Effect.runPromise(
        this.streamManager.connectStream(testStream, (newLogs) => {
          if (!this.isStreaming) return
          
          // Add new logs to viewer
          this.viewer.appendLogs(newLogs)
          
          // Occasionally log statistics
          if (Math.random() < 0.1) { // 10% chance
            this.logStats()
          }
        })
      )
    } catch (error) {
      if (!this.isStreaming) {
        console.log('🛑 Streaming stopped')
      } else {
        console.error('❌ Streaming error:', error)
      }
    }
  }

  /**
   * Stop log streaming
   */
  stopStreaming(): void {
    if (!this.isStreaming) {
      console.log('⚠️ Streaming not active')
      return
    }

    console.log('🛑 Stopping log stream...')
    this.isStreaming = false
    this.streamController?.abort()
    console.log('✅ Streaming stopped')
  }

  /**
   * Demonstrate search functionality
   */
  async demonstrateSearch(): Promise<void> {
    console.log('\n🔍 Demonstrating Search Functionality:')
    
    const searchQueries = [
      'error',
      'user_\\d+',
      'SELECT.*FROM',
      '{"event"',
      'timeout',
      'HTTP/1.1.*200'
    ]

    for (const query of searchQueries) {
      console.log(`  Searching for: "${query}"`)
      this.viewer.search(query)
      
      const state = this.viewer.getState()
      const resultCount = state?.filteredLogs.length || 0
      const totalCount = state?.logs.length || 0
      
      console.log(`    Found: ${resultCount}/${totalCount} logs`)
      
      // Wait a bit to simulate user interaction
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Clear search
    this.viewer.search('')
    console.log('  Search cleared')
  }

  /**
   * Demonstrate filtering by log levels
   */
  async demonstrateFiltering(): Promise<void> {
    console.log('\n🎯 Demonstrating Log Level Filtering:')
    
    const state = this.viewer.getState()
    const totalLogs = state?.logs.length || 0
    
    console.log(`  Total logs: ${totalLogs}`)
    
    // Show only errors and fatals
    this.viewer.toggleLevel('trace')
    this.viewer.toggleLevel('debug')
    this.viewer.toggleLevel('info')
    this.viewer.toggleLevel('warn')
    
    const errorState = this.viewer.getState()
    const errorCount = errorState?.filteredLogs.length || 0
    console.log(`  Errors only: ${errorCount} logs`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Show only info and above
    this.viewer.toggleLevel('info')
    this.viewer.toggleLevel('warn')
    
    const infoState = this.viewer.getState()
    const infoCount = infoState?.filteredLogs.length || 0
    console.log(`  Info and above: ${infoCount} logs`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Reset to show all levels
    this.viewer.toggleLevel('trace')
    this.viewer.toggleLevel('debug')
    
    console.log('  All levels restored')
  }

  /**
   * Perform log analysis and display results
   */
  async performAnalysis(): Promise<void> {
    console.log('\n📊 Performing Log Analysis:')
    
    const state = this.viewer.getState()
    const logs = state?.logs || []
    
    if (logs.length === 0) {
      console.log('  No logs to analyze')
      return
    }

    const stats = await Effect.runPromise(this.analyzer.analyzeLogs(logs))
    
    console.log(`  Total logs analyzed: ${stats.totalLogs}`)
    console.log(`  Time range: ${stats.timeRange.start.toLocaleString()} - ${stats.timeRange.end.toLocaleString()}`)
    console.log(`  Duration: ${(stats.timeRange.duration / 1000).toFixed(1)} seconds`)
    console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(1)}%`)
    console.log(`  Average logs/minute: ${stats.averageLogsPerMinute.toFixed(1)}`)
    console.log(`  Peak logs/minute: ${stats.peakLogsPerMinute}`)
    console.log(`  Unique messages: ${stats.uniqueMessages}`)
    console.log(`  Pattern coverage: ${(stats.patternCoverage * 100).toFixed(1)}%`)
    
    console.log('\n  Top patterns:')
    stats.topPatterns.slice(0, 5).forEach((pattern, i) => {
      console.log(`    ${i + 1}. [${pattern.category}/${pattern.severity}] ${pattern.template} (${pattern.count} occurrences)`)
    })
    
    const errorGroups = this.analyzer.getErrorGroups()
    if (errorGroups.length > 0) {
      console.log('\n  Top error groups:')
      errorGroups.slice(0, 3).forEach((group, i) => {
        console.log(`    ${i + 1}. ${group.message} (${group.count} occurrences)`)
      })
    }
  }

  /**
   * Log current streaming statistics
   */
  private async logStats(): Promise<void> {
    const streamStats = await Effect.runPromise(this.streamManager.getStats())
    const viewerState = this.viewer.getState()
    
    console.log(`📈 Stats - Logs: ${viewerState?.logs.length}, Rate: ${streamStats.logsPerSecond}/s, Buffer: ${(streamStats.bufferUtilization * 100).toFixed(1)}%, Dropped: ${streamStats.droppedLogs}`)
  }

  /**
   * Demonstrate syntax highlighting
   */
  demonstrateSyntaxHighlighting(): void {
    console.log('\n🎨 Syntax Highlighting Active:')
    console.log('  - JSON logs are syntax highlighted')
    console.log('  - SQL queries show keyword highlighting')
    console.log('  - Error stack traces are formatted')
    console.log('  - HTTP logs show structured coloring')
    console.log('  - Container logs highlight IDs and commands')
  }

  /**
   * Test performance with large datasets
   */
  async testPerformance(): Promise<void> {
    console.log('\n⚡ Performance Testing:')
    
    // Test with large dataset
    console.log('  Generating 50,000 log entries...')
    const startGen = performance.now()
    const largeLogs = generateSampleLogs(50000)
    const endGen = performance.now()
    console.log(`  Generation took: ${(endGen - startGen).toFixed(1)}ms`)
    
    // Test viewer initialization
    console.log('  Initializing viewer with large dataset...')
    const startInit = performance.now()
    const perfViewer = new LogViewer()
    await Effect.runPromise(perfViewer.init({
      logs: largeLogs,
      maxBufferSize: 50000,
      height: 600
    }))
    const endInit = performance.now()
    console.log(`  Initialization took: ${(endInit - startInit).toFixed(1)}ms`)
    
    // Test search performance
    console.log('  Testing search performance...')
    const startSearch = performance.now()
    perfViewer.search('error')
    const endSearch = performance.now()
    console.log(`  Search took: ${(endSearch - startSearch).toFixed(1)}ms`)
    
    // Test filtering performance
    console.log('  Testing filter performance...')
    const startFilter = performance.now()
    perfViewer.toggleLevel('debug')
    perfViewer.toggleLevel('trace')
    const endFilter = performance.now()
    console.log(`  Filtering took: ${(endFilter - startFilter).toFixed(1)}ms`)
    
    // Cleanup
    const state = perfViewer.getState()
    if (state) {
      await Effect.runPromise(perfViewer.cleanup(state))
    }
    
    console.log('  ✅ Performance test completed')
  }

  /**
   * Export current analysis
   */
  async exportAnalysis(): Promise<string> {
    console.log('\n📤 Exporting Analysis...')
    
    const state = this.viewer.getState()
    const logs = state?.logs || []
    
    const report = await Effect.runPromise(this.analyzer.exportAnalysis(logs))
    console.log('  ✅ Analysis exported')
    
    return report
  }

  /**
   * Run complete demo sequence
   */
  async runDemo(): Promise<void> {
    try {
      // Initialize
      await this.initialize()
      
      // Demo syntax highlighting
      this.demonstrateSyntaxHighlighting()
      
      // Demo search
      await this.demonstrateSearch()
      
      // Demo filtering
      await this.demonstrateFiltering()
      
      // Performance test
      await this.testPerformance()
      
      // Start streaming
      console.log('\n🔄 Starting real-time streaming demo...')
      setTimeout(() => this.startStreaming(), 1000)
      
      // Run for a while then stop
      setTimeout(() => {
        this.stopStreaming()
        this.performAnalysis()
      }, 10000) // Run for 10 seconds
      
      console.log('\n✅ Demo sequence completed!')
      
    } catch (error) {
      console.error('❌ Demo failed:', error)
    }
  }

  /**
   * Cleanup demo resources
   */
  async cleanup(): Promise<void> {
    this.stopStreaming()
    
    const state = this.viewer.getState()
    if (state) {
      await Effect.runPromise(this.viewer.cleanup(state))
    }
    
    console.log('🧹 Demo cleaned up')
  }
}

/**
 * Run the LogViewer demo
 */
export async function runLogViewerDemo(): Promise<void> {
  const demo = new LogViewerDemo()
  
  try {
    await demo.runDemo()
    
    // Keep running for demo purposes
    console.log('\n⏳ Demo running... Press Ctrl+C to stop')
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down demo...')
      await demo.cleanup()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Demo error:', error)
    await demo.cleanup()
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runLogViewerDemo().catch(console.error)
}
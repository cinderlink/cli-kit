/**
 * Log Output Factory
 * 
 * This module provides a factory for creating different types of log outputs
 * based on configuration.
 * 
 * @module plugins/core/outputs/factory
 */

import type { LogOutput, LoggerConfig } from '../types'
import { ConsoleLogOutput } from './console-output'
import { FileLogOutput } from './file-output'
import { StreamLogOutput } from './stream-output'

/**
 * Factory for creating log output instances
 */
export class LogOutputFactory {
  /**
   * Create a log output based on type and configuration
   */
  static create(type: string, config: LoggerConfig): LogOutput {
    switch (type.toLowerCase()) {
      case 'console':
        return new ConsoleLogOutput(config)
      
      case 'file':
        return new FileLogOutput(config)
      
      case 'stream':
        return new StreamLogOutput(config)
      
      default:
        throw new Error(`Unknown log output type: ${type}`)
    }
  }

  /**
   * Get available output types
   */
  static getAvailableTypes(): string[] {
    return ['console', 'file', 'stream']
  }

  /**
   * Validate output type
   */
  static isValidType(type: string): boolean {
    return this.getAvailableTypes().includes(type.toLowerCase())
  }

  /**
   * Get output type description
   */
  static getTypeDescription(type: string): string {
    switch (type.toLowerCase()) {
      case 'console':
        return 'Output logs to console/terminal with formatting and colors'
      
      case 'file':
        return 'Output logs to files with rotation and compression support'
      
      case 'stream':
        return 'Output logs to real-time streams for components and subscribers'
      
      default:
        return 'Unknown output type'
    }
  }

  /**
   * Create multiple outputs from configuration
   */
  static createMultiple(config: LoggerConfig): Map<string, LogOutput> {
    const outputs = new Map<string, LogOutput>()
    
    for (const outputType of config.outputs) {
      try {
        const output = this.create(outputType, config)
        outputs.set(outputType, output)
      } catch (error) {
        console.error(`Failed to create output '${outputType}':`, error)
      }
    }
    
    return outputs
  }
}
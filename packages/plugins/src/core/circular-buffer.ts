/**
 * Circular Buffer Implementation
 * 
 * High-performance circular buffer for storing log entries with a fixed capacity.
 * When the buffer is full, new entries overwrite the oldest entries.
 * 
 * @module plugins/core/circular-buffer
 */

import type { CircularBuffer } from './types'

/**
 * Circular buffer implementation for log entries
 */
export class CircularBufferImpl<T> implements CircularBuffer<T> {
  private buffer: (T | undefined)[]
  private head = 0 // Points to the next position to write
  private tail = 0 // Points to the oldest element
  private count = 0 // Number of elements in buffer
  private readonly maxSize: number

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Circular buffer capacity must be positive')
    }
    
    this.maxSize = capacity
    this.buffer = new Array(capacity).fill(undefined)
  }

  /**
   * Add an item to the buffer
   */
  push(item: T): void {
    this.buffer[this.head] = item
    
    if (this.isFull()) {
      // Buffer is full, move tail to next position (overwrite oldest)
      this.tail = (this.tail + 1) % this.maxSize
    } else {
      // Buffer not full, increase count
      this.count++
    }
    
    // Move head to next position
    this.head = (this.head + 1) % this.maxSize
  }

  /**
   * Get all items as an array (oldest to newest)
   */
  toArray(): T[] {
    if (this.isEmpty()) {
      return []
    }

    const result: T[] = []
    
    if (this.count === this.maxSize) {
      // Buffer is full, start from tail
      for (let i = 0; i < this.count; i++) {
        const index = (this.tail + i) % this.maxSize
        const item = this.buffer[index]
        if (item !== undefined) {
          result.push(item)
        }
      }
    } else {
      // Buffer not full, elements are from 0 to head-1
      for (let i = 0; i < this.count; i++) {
        const item = this.buffer[i]
        if (item !== undefined) {
          result.push(item)
        }
      }
    }

    return result
  }

  /**
   * Get the current number of items in the buffer
   */
  size(): number {
    return this.count
  }

  /**
   * Get the maximum capacity of the buffer
   */
  capacity(): number {
    return this.maxSize
  }

  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.buffer.fill(undefined)
    this.head = 0
    this.tail = 0
    this.count = 0
  }

  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.count === this.maxSize
  }

  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0
  }

  /**
   * Get the oldest item without removing it
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined
    }
    
    return this.buffer[this.tail]
  }

  /**
   * Get the newest item without removing it
   */
  peekNewest(): T | undefined {
    if (this.isEmpty()) {
      return undefined
    }
    
    const newestIndex = this.head === 0 ? this.maxSize - 1 : this.head - 1
    return this.buffer[newestIndex]
  }

  /**
   * Get items that match a predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.toArray().filter(predicate)
  }

  /**
   * Get the last N items
   */
  takeLast(n: number): T[] {
    if (n <= 0) {
      return []
    }
    
    const allItems = this.toArray()
    return allItems.slice(-n)
  }

  /**
   * Get the first N items
   */
  takeFirst(n: number): T[] {
    if (n <= 0) {
      return []
    }
    
    const allItems = this.toArray()
    return allItems.slice(0, n)
  }

  /**
   * Get items within a range
   */
  slice(start: number, end?: number): T[] {
    const allItems = this.toArray()
    return allItems.slice(start, end)
  }

  /**
   * Check if buffer contains an item
   */
  contains(item: T): boolean {
    return this.toArray().includes(item)
  }

  /**
   * Find the first item that matches a predicate
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.toArray().find(predicate)
  }

  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      size: this.size(),
      capacity: this.capacity(),
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      utilizationPercent: Math.round((this.size() / this.capacity()) * 100),
      head: this.head,
      tail: this.tail,
    }
  }

  /**
   * Create a snapshot of the buffer state for debugging
   */
  debug() {
    return {
      ...this.getStats(),
      buffer: this.buffer.map((item, index) => ({
        index,
        value: item,
        isHead: index === this.head,
        isTail: index === this.tail,
      })),
    }
  }
}
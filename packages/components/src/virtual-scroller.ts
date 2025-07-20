/**
 * VirtualScroller - Efficient virtual scrolling implementation
 * 
 * Provides virtual scrolling capabilities for large datasets by only
 * rendering visible items and maintaining a virtual viewport.
 */

import { Effect } from "effect"

export interface VirtualScrollerOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number // Buffer items to render outside visible area
}

export interface VirtualScrollerState<T> {
  items: T[]
  scrollTop: number
  visibleStart: number
  visibleEnd: number
  totalHeight: number
  visibleItems: T[]
}

export class VirtualScroller<T> {
  private options: Required<VirtualScrollerOptions>
  private state: VirtualScrollerState<T>
  
  constructor(options: VirtualScrollerOptions) {
    this.options = {
      overscan: 5,
      ...options
    }
    
    this.state = {
      items: [],
      scrollTop: 0,
      visibleStart: 0,
      visibleEnd: 0,
      totalHeight: 0,
      visibleItems: []
    }
  }
  
  /**
   * Set the items to virtualize
   */
  setItems(items: T[]): void {
    this.state.items = items
    this.state.totalHeight = items.length * this.options.itemHeight
    this.updateVisibleRange()
  }
  
  /**
   * Update scroll position
   */
  setScrollTop(scrollTop: number): void {
    this.state.scrollTop = Math.max(0, Math.min(scrollTop, this.getMaxScrollTop()))
    this.updateVisibleRange()
  }
  
  /**
   * Get current state
   */
  getState(): VirtualScrollerState<T> {
    return { ...this.state }
  }
  
  /**
   * Get maximum scroll position
   */
  getMaxScrollTop(): number {
    return Math.max(0, this.state.totalHeight - this.options.containerHeight)
  }
  
  /**
   * Update the visible range based on scroll position
   */
  private updateVisibleRange(): void {
    const visibleStart = Math.floor(this.state.scrollTop / this.options.itemHeight)
    const visibleEnd = Math.min(
      this.state.items.length,
      Math.ceil((this.state.scrollTop + this.options.containerHeight) / this.options.itemHeight)
    )
    
    // Add overscan buffer
    const bufferedStart = Math.max(0, visibleStart - this.options.overscan)
    const bufferedEnd = Math.min(this.state.items.length, visibleEnd + this.options.overscan)
    
    this.state.visibleStart = bufferedStart
    this.state.visibleEnd = bufferedEnd
    this.state.visibleItems = this.state.items.slice(bufferedStart, bufferedEnd)
  }
  
  /**
   * Get item at index
   */
  getItemAt(index: number): T | undefined {
    return this.state.items[index]
  }
  
  /**
   * Get visible items with their indices
   */
  getVisibleItemsWithIndices(): Array<{ item: T; index: number }> {
    return this.state.visibleItems.map((item, i) => ({
      item,
      index: this.state.visibleStart + i
    }))
  }
  
  /**
   * Scroll to specific item
   */
  scrollToItem(index: number): void {
    const targetScrollTop = index * this.options.itemHeight
    this.setScrollTop(targetScrollTop)
  }
  
  /**
   * Scroll to bottom (for follow mode)
   */
  scrollToBottom(): void {
    this.setScrollTop(this.getMaxScrollTop())
  }
  
  /**
   * Check if item is visible
   */
  isItemVisible(index: number): boolean {
    return index >= this.state.visibleStart && index < this.state.visibleEnd
  }
}
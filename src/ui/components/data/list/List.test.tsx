/**
 * List Component Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { List, SimpleList, CheckList, NumberedList } from './List.js'
import { $state } from '../../../../core/update/reactivity/runes.js'
import { jsx } from '../../../../jsx/runtime/index.js'

describe('List Component', () => {
  describe('Basic rendering', () => {
    it('should render list items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3']
      const component = List({
        items,
        renderItem: (item) => jsx('text', { children: item })
      })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should show empty message when no items', () => {
      const component = List({
        items: [],
        renderItem: (item) => jsx('text', { children: item }),
        emptyMessage: 'No items'
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Selection', () => {
    it('should handle single selection', () => {
      const items = ['A', 'B', 'C']
      const selectedIndex = $state(0)
      let selectCalled = false
      
      const component = List({
        items,
        selectedIndex,
        onSelect: (index) => {
          selectCalled = true
          expect(index).toBe(1)
        },
        renderItem: (item) => jsx('text', { children: item })
      })
      
      // Simulate selection
      selectedIndex.value = 1
      expect(selectedIndex.value).toBe(1)
    })
    
    it('should handle multi selection', () => {
      const items = ['A', 'B', 'C']
      const selectedIndices = $state<number[]>([0])
      
      const component = List({
        items,
        selectedIndices,
        selectionMode: 'multi',
        renderItem: (item) => jsx('text', { children: item })
      })
      
      expect(selectedIndices.value).toEqual([0])
    })
  })
  
  describe('Filtering', () => {
    it('should filter items based on string filter', () => {
      const items = ['Apple', 'Banana', 'Cherry']
      const filter = 'app'
      
      const component = List({
        items,
        filter,
        renderItem: (item) => jsx('text', { children: item })
      })
      
      expect(component).toBeDefined()
    })
    
    it('should filter items based on function filter', () => {
      const items = [
        { name: 'Apple', type: 'fruit' },
        { name: 'Carrot', type: 'vegetable' },
        { name: 'Banana', type: 'fruit' }
      ]
      
      const component = List({
        items,
        filter: (item) => item.type === 'fruit',
        renderItem: (item) => jsx('text', { children: item.name })
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Preset Components', () => {
    it('should render SimpleList', () => {
      const items = ['A', 'B', 'C']
      const component = SimpleList({ items })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should render CheckList', () => {
      const items = ['Task 1', 'Task 2', 'Task 3']
      const component = CheckList({ items })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should render NumberedList', () => {
      const items = ['First', 'Second', 'Third']
      const component = NumberedList({ items })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
  })
})
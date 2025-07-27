/**
 * Tabs Component Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Tabs, Tab, SimpleTabs, PillTabs, VerticalTabs } from './Tabs.js'
import { $state } from '../../../../core/update/reactivity/runes.js'
import { jsx } from '../../../../jsx/runtime/index.js'

describe('Tabs Component', () => {
  describe('Basic rendering', () => {
    it('should render tabs with content', () => {
      const component = Tabs({
        children: [
          Tab({
            label: 'Tab 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Tab 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should render tabs with icons', () => {
      const component = Tabs({
        children: [
          Tab({
            label: 'Settings',
            icon: '⚙️',
            children: jsx('text', { children: 'Settings content' })
          }),
          Tab({
            label: 'Profile',
            icon: '👤',
            children: jsx('text', { children: 'Profile content' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
    
    it('should render tabs with badges', () => {
      const component = Tabs({
        children: [
          Tab({
            label: 'Messages',
            badge: 5,
            children: jsx('text', { children: 'Messages content' })
          }),
          Tab({
            label: 'Notifications',
            badge: 'New',
            children: jsx('text', { children: 'Notifications content' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Tab selection', () => {
    it('should handle controlled active index', () => {
      const activeIndex = $state(1)
      let changeCalled = false
      
      const component = Tabs({
        activeIndex,
        onTabChange: (index) => {
          changeCalled = true
          expect(index).toBe(0)
        },
        children: [
          Tab({
            label: 'Tab 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Tab 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(activeIndex.value).toBe(1)
    })
    
    it('should handle uncontrolled active index', () => {
      const component = Tabs({
        children: [
          Tab({
            label: 'Tab 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Tab 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Tab features', () => {
    it('should handle closeable tabs', () => {
      let closeCalled = false
      
      const component = Tabs({
        onTabClose: (index) => {
          closeCalled = true
          expect(index).toBeGreaterThanOrEqual(0)
        },
        children: [
          Tab({
            label: 'Closeable Tab',
            closeable: true,
            children: jsx('text', { children: 'Can be closed' })
          }),
          Tab({
            label: 'Fixed Tab',
            closeable: false,
            children: jsx('text', { children: 'Cannot be closed' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
    
    it('should handle disabled tabs', () => {
      const component = Tabs({
        children: [
          Tab({
            label: 'Active Tab',
            disabled: false,
            children: jsx('text', { children: 'Active content' })
          }),
          Tab({
            label: 'Disabled Tab',
            disabled: true,
            children: jsx('text', { children: 'Disabled content' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Tab orientations', () => {
    it('should render horizontal tabs', () => {
      const component = Tabs({
        orientation: 'horizontal',
        children: [
          Tab({
            label: 'Tab 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Tab 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
    
    it('should render vertical tabs', () => {
      const component = Tabs({
        orientation: 'vertical',
        children: [
          Tab({
            label: 'Tab 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Tab 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
    })
  })
  
  describe('Tab positions', () => {
    it('should render tabs at different positions', () => {
      const positions = ['top', 'bottom', 'left', 'right'] as const
      
      positions.forEach(position => {
        const component = Tabs({
          tabPosition: position,
          children: [
            Tab({
              label: 'Tab',
              children: jsx('text', { children: 'Content' })
            })
          ]
        })
        
        expect(component).toBeDefined()
      })
    })
  })
  
  describe('Preset Components', () => {
    it('should render SimpleTabs', () => {
      const component = SimpleTabs({
        children: [
          Tab({
            label: 'Simple 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Simple 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should render PillTabs', () => {
      const component = PillTabs({
        children: [
          Tab({
            label: 'Pill 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Pill 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
    
    it('should render VerticalTabs', () => {
      const component = VerticalTabs({
        children: [
          Tab({
            label: 'Vertical 1',
            children: jsx('text', { children: 'Content 1' })
          }),
          Tab({
            label: 'Vertical 2',
            children: jsx('text', { children: 'Content 2' })
          })
        ]
      })
      
      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
  })
})
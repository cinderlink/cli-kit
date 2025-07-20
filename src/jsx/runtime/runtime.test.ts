/**
 * JSX Runtime Tests
 * 
 * Tests for the JSX runtime including:
 * - JSX element creation and rendering
 * - Component registration and lifecycle
 * - Scope integration with JSX
 * - CLI component handling
 * - Intrinsic elements (text, vstack, hstack, box)
 * - Fragment support
 * - Props handling and children
 * - Style application
 * - Context propagation
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test'
import { Effect } from 'effect'
import { 
  jsx, 
  jsxs, 
  jsxDEV, 
  Fragment, 
  createElement,
  JSXContext,
  type JSX
} from './index'
import { scopeManager } from '../../scope'
import { text, vstack, hstack } from '../../core/view'
import type { View } from '../../core/types'
import { style } from '../../styling'

describe('JSX Runtime', () => {
  beforeEach(() => {
    // Clear any state
    scopeManager.clear()
  })

  describe('jsx function', () => {
    test('should create intrinsic text element', () => {
      const element = jsx('text', { children: 'Hello World' })
      
      expect(element.type).toBe('text')
      expect(element.content).toBe('Hello World')
    })

    test('should create vstack element', () => {
      const child1 = jsx('text', { children: 'Line 1' })
      const child2 = jsx('text', { children: 'Line 2' })
      
      const element = jsx('vstack', {
        gap: 1,
        align: 'center',
        children: [child1, child2]
      })
      
      expect(element.type).toBe('vstack')
      expect(element.children).toHaveLength(2)
      expect(element.gap).toBe(1)
      expect(element.align).toBe('center')
    })

    test('should create hstack element', () => {
      const element = jsx('hstack', {
        gap: 2,
        align: 'middle',
        children: [
          jsx('text', { children: 'Left' }),
          jsx('text', { children: 'Right' })
        ]
      })
      
      expect(element.type).toBe('hstack')
      expect(element.children).toHaveLength(2)
      expect(element.gap).toBe(2)
      expect(element.align).toBe('middle')
    })

    test('should create styled-text element', () => {
      const textStyle = style({
        color: 'red',
        bold: true
      })
      
      const element = jsx('styled-text', {
        style: textStyle,
        children: 'Styled Text'
      })
      
      expect(element.type).toBe('styledText')
      expect(element.content).toBe('Styled Text')
      expect(element.style).toBe(textStyle)
    })

    test('should handle styledText alias', () => {
      const element = jsx('styledText', {
        style: style({ italic: true }),
        children: 'Italic'
      })
      
      expect(element.type).toBe('styledText')
    })
  })

  describe('Component handling', () => {
    test('should execute function components', () => {
      const Component = (props: { name: string }) => 
        jsx('text', { children: `Hello ${props.name}` })
      
      const element = jsx(Component, { name: 'World' })
      
      expect(element.type).toBe('text')
      expect(element.content).toBe('Hello World')
    })

    test('should handle nested components', () => {
      const Header = (props: { title: string }) =>
        jsx('text', { children: props.title })
      
      const Layout = (props: { children: any }) =>
        jsx('vstack', {
          gap: 1,
          children: [
            jsx(Header, { title: 'Header' }),
            props.children
          ]
        })
      
      const element = jsx(Layout, {
        children: jsx('text', { children: 'Content' })
      })
      
      expect(element.type).toBe('vstack')
      expect(element.children).toHaveLength(2)
      expect(element.children[0].content).toBe('Header')
      expect(element.children[1].content).toBe('Content')
    })

    test('should handle async components', async () => {
      const AsyncComponent = async (props: { delay: number }) => {
        await new Promise(resolve => setTimeout(resolve, props.delay))
        return jsx('text', { children: 'Async loaded' })
      }
      
      const element = jsx(AsyncComponent, { delay: 10 })
      
      // Should return a promise
      expect(element).toBeInstanceOf(Promise)
      
      const resolved = await element
      expect(resolved.type).toBe('text')
      expect(resolved.content).toBe('Async loaded')
    })
  })

  describe('CLI Components', () => {
    test('should register CLI component', () => {
      const CLI = JSXContext.registry.components.get('cli')
      expect(CLI).toBeDefined()
      
      const element = jsx('cli', {
        name: 'test-app',
        version: '1.0.0',
        children: []
      })
      
      // CLI component should register scope
      const scopes = scopeManager.getScopesByPath(['test-app'])
      expect(scopes).toHaveLength(1)
      expect(scopes[0].type).toBe('cli')
    })

    test('should handle plugin components', () => {
      jsx('cli', {
        name: 'myapp',
        children: jsx('plugin', {
          name: 'auth',
          description: 'Auth plugin',
          children: []
        })
      })
      
      const pluginScopes = scopeManager.getScopesByPath(['myapp', 'auth'])
      expect(pluginScopes).toHaveLength(1)
      expect(pluginScopes[0].type).toBe('plugin')
    })

    test('should handle command components', () => {
      const handler = mock(() => jsx('text', { children: 'Output' }))
      
      jsx('cli', {
        name: 'myapp',
        children: jsx('command', {
          name: 'test',
          description: 'Test command',
          children: handler
        })
      })
      
      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'test'])
      expect(cmdScopes).toHaveLength(1)
      expect(cmdScopes[0].type).toBe('command')
      expect(cmdScopes[0].handler).toBe(handler)
    })

    test('should handle arg and flag components', () => {
      jsx('cli', {
        name: 'myapp',
        children: jsx('command', {
          name: 'deploy',
          children: [
            jsx('arg', {
              name: 'target',
              description: 'Deploy target',
              required: true
            }),
            jsx('flag', {
              name: 'force',
              alias: 'f',
              description: 'Force deploy'
            }),
            () => jsx('text', { children: 'Deploying...' })
          ]
        })
      })
      
      const cmdScope = scopeManager.getScopesByPath(['myapp', 'deploy'])[0]
      const children = scopeManager.getChildScopes(cmdScope.id)
      
      const argScope = children.find(c => c.type === 'arg')
      expect(argScope?.name).toBe('target')
      expect(argScope?.metadata?.required).toBe(true)
      
      const flagScope = children.find(c => c.type === 'flag')
      expect(flagScope?.name).toBe('force')
      expect(flagScope?.metadata?.alias).toBe('f')
    })
  })

  describe('Fragment support', () => {
    test('should handle fragments', () => {
      const element = jsx(Fragment, {
        children: [
          jsx('text', { children: 'First' }),
          jsx('text', { children: 'Second' })
        ]
      })
      
      expect(Array.isArray(element)).toBe(true)
      expect(element).toHaveLength(2)
      expect(element[0].content).toBe('First')
      expect(element[1].content).toBe('Second')
    })

    test('should flatten nested fragments', () => {
      const element = jsx(Fragment, {
        children: [
          jsx('text', { children: 'A' }),
          jsx(Fragment, {
            children: [
              jsx('text', { children: 'B' }),
              jsx('text', { children: 'C' })
            ]
          }),
          jsx('text', { children: 'D' })
        ]
      })
      
      expect(Array.isArray(element)).toBe(true)
      expect(element).toHaveLength(4)
      expect(element.map(e => e.content)).toEqual(['A', 'B', 'C', 'D'])
    })
  })

  describe('jsxs and jsxDEV', () => {
    test('jsxs should be same as jsx', () => {
      const element1 = jsx('text', { children: 'Test' })
      const element2 = jsxs('text', { children: 'Test' })
      
      expect(element1).toEqual(element2)
    })

    test('jsxDEV should be same as jsx', () => {
      const element1 = jsx('text', { children: 'Test' })
      const element2 = jsxDEV('text', { children: 'Test' })
      
      expect(element1).toEqual(element2)
    })
  })

  describe('createElement', () => {
    test('should be same as jsx', () => {
      const element1 = jsx('text', { children: 'Test' })
      const element2 = createElement('text', { children: 'Test' })
      
      expect(element1).toEqual(element2)
    })
  })

  describe('Children handling', () => {
    test('should handle single child', () => {
      const element = jsx('vstack', {
        children: jsx('text', { children: 'Single child' })
      })
      
      expect(element.children).toHaveLength(1)
      expect(element.children[0].content).toBe('Single child')
    })

    test('should handle array of children', () => {
      const element = jsx('vstack', {
        children: [
          jsx('text', { children: 'Child 1' }),
          jsx('text', { children: 'Child 2' }),
          jsx('text', { children: 'Child 3' })
        ]
      })
      
      expect(element.children).toHaveLength(3)
    })

    test('should filter out null/undefined children', () => {
      const element = jsx('vstack', {
        children: [
          jsx('text', { children: 'Valid' }),
          null,
          undefined,
          jsx('text', { children: 'Also valid' }),
          false
        ]
      })
      
      expect(element.children).toHaveLength(2)
      expect(element.children[0].content).toBe('Valid')
      expect(element.children[1].content).toBe('Also valid')
    })

    test('should handle text children', () => {
      const element = jsx('vstack', {
        children: ['Text 1', 'Text 2', 123, true]
      })
      
      expect(element.children).toHaveLength(4)
      expect(element.children[0].content).toBe('Text 1')
      expect(element.children[1].content).toBe('Text 2')
      expect(element.children[2].content).toBe('123')
      expect(element.children[3].content).toBe('true')
    })
  })

  describe('Props spreading', () => {
    test('should spread props correctly', () => {
      const props = {
        gap: 2,
        align: 'center' as const,
        children: [
          jsx('text', { children: 'A' }),
          jsx('text', { children: 'B' })
        ]
      }
      
      const element = jsx('vstack', props)
      
      expect(element.gap).toBe(2)
      expect(element.align).toBe('center')
      expect(element.children).toHaveLength(2)
    })
  })

  describe('Box component', () => {
    test('should handle box intrinsic element', () => {
      const element = jsx('box', {
        borderStyle: 'rounded',
        borderColor: 'green',
        padding: 1,
        width: 50,
        children: jsx('text', { children: 'Boxed content' })
      })
      
      // Box should be converted to appropriate view structure
      expect(element).toBeDefined()
      // Implementation depends on how box is handled in jsx runtime
    })
  })

  describe('Error handling', () => {
    test('should throw for unknown intrinsic elements', () => {
      expect(() => {
        jsx('unknown-element' as any, { children: 'Test' })
      }).toThrow()
    })

    test('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Component error')
      }
      
      expect(() => {
        jsx(ErrorComponent, {})
      }).toThrow('Component error')
    })
  })

  describe('Scope integration', () => {
    test('should use scopeManager from JSXContext', () => {
      expect(JSXContext.getScopeManager()).toBe(scopeManager)
    })

    test('should register scopes through JSX components', () => {
      jsx('cli', {
        name: 'scope-test',
        children: jsx('command', {
          name: 'cmd',
          children: () => jsx('text', { children: 'Test' })
        })
      })
      
      // Should have registered scopes
      expect(scopeManager.getAllScopes()).toHaveLength(2) // cli + command
    })
  })

  describe('Complex JSX structures', () => {
    test('should handle deeply nested JSX', () => {
      const element = jsx('vstack', {
        gap: 1,
        children: [
          jsx('text', { children: 'Header' }),
          jsx('hstack', {
            gap: 2,
            children: [
              jsx('vstack', {
                children: [
                  jsx('text', { children: 'A1' }),
                  jsx('text', { children: 'A2' })
                ]
              }),
              jsx('vstack', {
                children: [
                  jsx('text', { children: 'B1' }),
                  jsx('text', { children: 'B2' })
                ]
              })
            ]
          }),
          jsx('text', { children: 'Footer' })
        ]
      })
      
      expect(element.type).toBe('vstack')
      expect(element.children).toHaveLength(3)
      expect(element.children[1].type).toBe('hstack')
      expect(element.children[1].children).toHaveLength(2)
    })

    test('should handle conditional rendering', () => {
      const showHeader = true
      const showFooter = false
      
      const element = jsx('vstack', {
        children: [
          showHeader && jsx('text', { children: 'Header' }),
          jsx('text', { children: 'Content' }),
          showFooter && jsx('text', { children: 'Footer' })
        ]
      })
      
      expect(element.children).toHaveLength(2)
      expect(element.children[0].content).toBe('Header')
      expect(element.children[1].content).toBe('Content')
    })

    test('should handle list rendering', () => {
      const items = ['Apple', 'Banana', 'Cherry']
      
      const element = jsx('vstack', {
        children: items.map(item => 
          jsx('text', { children: item })
        )
      })
      
      expect(element.children).toHaveLength(3)
      expect(element.children.map(c => c.content)).toEqual(items)
    })
  })
})
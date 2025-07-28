/**
 * JSX Runtime Tests
 *
 * Comprehensive tests for the JSX runtime system
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Effect } from 'effect'
import { jsx, jsxs, jsxDEV, Fragment, createElement, JSXContext } from './index'
import { scopeManager } from '../../core/model/scope/manager'
import { text } from '../../core/view/primitives/view'

describe('JSX Runtime', () => {
  beforeEach(() => {
    // Clear any existing scope state
    scopeManager.clear()
  })

  describe('jsx function', () => {
    it('should create basic JSX elements', () => {
      const element = jsx('div', { className: 'test' }, 'Hello World')

      expect(element).toBeDefined()
      expect(element.type).toBe('div')
      expect(element.props.className).toBe('test')
      expect(element.props.children).toBe('Hello World')
    })

    it('should handle empty props', () => {
      const element = jsx('span', {}, 'content')

      expect(element.type).toBe('span')
      expect(element.props.children).toBe('content')
    })

    it('should handle null props', () => {
      const element = jsx('p', null, 'text')

      expect(element.type).toBe('p')
      expect(element.props.children).toBe('text')
    })

    it('should handle multiple children', () => {
      const child1 = jsx('span', {}, 'first')
      const child2 = jsx('span', {}, 'second')
      const element = jsx('div', {}, child1, child2)

      expect(Array.isArray(element.props.children)).toBe(true)
      expect(element.props.children).toHaveLength(2)
    })

    it('should handle nested elements', () => {
      const inner = jsx('span', {}, 'inner text')
      const outer = jsx('div', { id: 'outer' }, inner)

      expect(outer.type).toBe('div')
      expect(outer.props.id).toBe('outer')
      expect(outer.props.children.type).toBe('span')
    })
  })

  describe('jsxs function', () => {
    it('should handle static children', () => {
      const element = jsxs(
        'ul',
        {},
        jsx('li', {}, 'Item 1'),
        jsx('li', {}, 'Item 2'),
        jsx('li', {}, 'Item 3')
      )

      expect(element.type).toBe('ul')
      expect(Array.isArray(element.props.children)).toBe(true)
      expect(element.props.children).toHaveLength(3)
    })

    it('should preserve child order', () => {
      const element = jsxs(
        'div',
        {},
        jsx('h1', {}, 'Title'),
        jsx('p', {}, 'Content'),
        jsx('footer', {}, 'Footer')
      )

      const children = element.props.children
      expect(children[0].type).toBe('h1')
      expect(children[1].type).toBe('p')
      expect(children[2].type).toBe('footer')
    })
  })

  describe('Fragment', () => {
    it('should create fragment elements', () => {
      const fragment = jsx(Fragment, {}, jsx('span', {}, 'First'), jsx('span', {}, 'Second'))

      expect(fragment.type).toBe(Fragment)
      expect(Array.isArray(fragment.props.children)).toBe(true)
    })

    it('should handle empty fragments', () => {
      const fragment = jsx(Fragment, {})

      expect(fragment.type).toBe(Fragment)
      expect(fragment.props.children).toBeUndefined()
    })
  })

  describe('createElement', () => {
    it('should create elements with component functions', () => {
      const MyComponent = (props: { name: string }) => jsx('div', {}, `Hello, ${props.name}!`)

      const element = createElement(MyComponent, { name: 'World' })

      expect(element.type).toBe(MyComponent)
      expect(element.props.name).toBe('World')
    })

    it('should handle component with children', () => {
      const Container = (props: { children: any }) =>
        jsx('div', { className: 'container' }, props.children)

      const element = createElement(Container, {}, jsx('p', {}, 'Child content'))

      expect(element.type).toBe(Container)
      expect(element.props.children.type).toBe('p')
    })
  })

  describe('Built-in components', () => {
    it('should handle text components', async () => {
      // Simulate built-in text component
      const TextComponent = (props: { children: string }) => {
        return text(props.children)
      }

      const element = jsx(TextComponent, {}, 'Hello World')
      expect(element.props.children).toBe('Hello World')
    })

    it('should handle container components', () => {
      const Box = (props: { border?: boolean; children: any }) =>
        jsx('div', {
          className: props.border ? 'bordered' : 'simple',
          children: props.children,
        })

      const element = jsx(Box, { border: true }, 'Content')

      expect(element.props.border).toBe(true)
      expect(element.props.children).toBe('Content')
    })
  })

  describe('Props handling', () => {
    it('should spread props correctly', () => {
      const baseProps = { id: 'test', className: 'base' }
      const element = jsx('div', { ...baseProps, className: 'override' })

      expect(element.props.id).toBe('test')
      expect(element.props.className).toBe('override') // Later props should override
    })

    it('should handle boolean props', () => {
      const element = jsx('input', {
        disabled: true,
        checked: false,
        hidden: undefined,
      })

      expect(element.props.disabled).toBe(true)
      expect(element.props.checked).toBe(false)
      expect(element.props.hidden).toBeUndefined()
    })

    it('should handle function props', () => {
      const handler = () => 'clicked'
      const element = jsx('button', { onClick: handler }, 'Click me')

      expect(typeof element.props.onClick).toBe('function')
      expect(element.props.onClick()).toBe('clicked')
    })
  })

  describe('Key and ref handling', () => {
    it('should handle key prop', () => {
      const element = jsx('div', { key: 'unique-key' }, 'content')

      expect(element.key).toBe('unique-key')
      expect(element.props.key).toBeUndefined() // Key should be extracted
    })

    it('should handle ref prop', () => {
      const refCallback = (node: any) => node
      const element = jsx('input', { ref: refCallback })

      expect(element.ref).toBe(refCallback)
      expect(element.props.ref).toBeUndefined() // Ref should be extracted
    })
  })

  describe('Conditional rendering', () => {
    it('should handle conditional elements', () => {
      const showContent = true
      const element = jsx('div', {}, showContent ? jsx('p', {}, 'Visible') : null)

      expect(element.props.children.type).toBe('p')
    })

    it('should handle false/null children', () => {
      const element = jsx('div', {}, false, null, undefined)

      // These should be filtered out or handled appropriately
      expect(element.props.children).toBeDefined()
    })
  })

  describe('List rendering', () => {
    it('should handle arrays of elements', () => {
      const items = ['apple', 'banana', 'cherry']
      const list = jsx(
        'ul',
        {},
        items.map((item, index) => jsx('li', { key: index }, item))
      )

      expect(list.type).toBe('ul')
      expect(Array.isArray(list.props.children)).toBe(true)
      expect(list.props.children).toHaveLength(3)
    })

    it('should preserve keys in lists', () => {
      const items = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]

      const list = jsx(
        'div',
        {},
        items.map(item => jsx('span', { key: item.id }, item.name))
      )

      const children = list.props.children
      expect(children[0].key).toBe(1)
      expect(children[1].key).toBe(2)
    })
  })

  describe('Error boundaries', () => {
    it('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Component error')
      }

      // JSX creation should not throw, rendering might
      const element = jsx(ErrorComponent, {})
      expect(element.type).toBe(ErrorComponent)
    })

    it('should handle invalid prop types', () => {
      const element = jsx('div', {
        style: 'invalid-style-type', // Usually should be object
      })

      expect(element.props.style).toBe('invalid-style-type')
      // JSX should accept it, validation happens elsewhere
    })
  })

  describe('Performance', () => {
    it('should create elements efficiently', () => {
      const startTime = performance.now()

      // Create many elements
      for (let i = 0; i < 1000; i++) {
        jsx('div', { id: `item-${i}` }, `Item ${i}`)
      }

      const endTime = performance.now()
      const creationTime = endTime - startTime

      expect(creationTime).toBeLessThan(100) // Should be fast
    })

    it('should handle deep nesting efficiently', () => {
      const startTime = performance.now()

      let nested = jsx('span', {}, 'deepest')
      for (let i = 0; i < 100; i++) {
        nested = jsx('div', { level: i }, nested)
      }

      const endTime = performance.now()
      const nestingTime = endTime - startTime

      expect(nestingTime).toBeLessThan(50)
      expect(nested.type).toBe('div')
    })
  })

  describe('Context integration', () => {
    it('should work with JSX context', () => {
      // Test context provider/consumer pattern
      const ThemeContext = {
        theme: 'dark',
        setTheme: (theme: string) => theme,
      }

      const Provider = (props: { value: any; children: any }) =>
        jsx('div', { 'data-context': 'provider' }, props.children)

      const element = jsx(Provider, { value: ThemeContext }, jsx('span', {}, 'Themed content'))

      expect(element.props.value).toBe(ThemeContext)
    })
  })

  describe('Memory management', () => {
    it('should not create circular references', () => {
      const parent = jsx('div', {})
      const child = jsx('span', { parent })

      // Should not create problematic references
      expect(child.props.parent).toBe(parent)
      expect(JSON.stringify(child)).toBeDefined() // Should be serializable
    })

    it('should handle large element trees', () => {
      const createTree = (depth: number): any => {
        if (depth === 0) return jsx('span', {}, 'leaf')
        return jsx('div', { depth }, createTree(depth - 1))
      }

      const tree = createTree(50)
      expect(tree.type).toBe('div')
      expect(tree.props.depth).toBe(50)
    })
  })
})

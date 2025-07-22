import { test, expect } from "bun:test"
import { jsx, vstack, hstack, box, text } from "./index"
import { Effect } from "effect"

test("jsx runtime converts vstack children to Views", async () => {
  const element = jsx('vstack', {}, 
    jsx('text', {}, 'Line 1'),
    jsx('text', {}, 'Line 2')
  )
  
  expect(element).toBeDefined()
  expect(element.render).toBeDefined()
  expect(typeof element.render).toBe('function')
  
  const rendered = await Effect.runPromise(element.render())
  expect(rendered).toBe('Line 1\nLine 2')
})

test("jsx runtime converts hstack children to Views", async () => {
  const element = jsx('hstack', {}, 
    jsx('text', {}, 'Left'),
    jsx('text', {}, 'Right')
  )
  
  expect(element).toBeDefined()
  expect(element.render).toBeDefined()
  expect(typeof element.render).toBe('function')
  
  const rendered = await Effect.runPromise(element.render())
  expect(rendered).toContain('Left')
  expect(rendered).toContain('Right')
})

test("jsx runtime converts box children to Views", async () => {
  const element = jsx('box', {}, 
    jsx('text', {}, 'Content')
  )
  
  expect(element).toBeDefined()
  expect(element.render).toBeDefined()
  expect(typeof element.render).toBe('function')
  
  const rendered = await Effect.runPromise(element.render())
  expect(rendered).toContain('┌')
  expect(rendered).toContain('┐')
  expect(rendered).toContain('│')
  expect(rendered).toContain('Content')
  expect(rendered).toContain('└')
  expect(rendered).toContain('┘')
})

test("jsx runtime handles mixed children types in vstack", async () => {
  const element = jsx('vstack', {},
    'Plain text',
    jsx('text', {}, 'JSX text'),
    jsx('box', {}, 'Boxed content')
  )
  
  expect(element).toBeDefined()
  const rendered = await Effect.runPromise(element.render())
  expect(rendered).toContain('Plain text')
  expect(rendered).toContain('JSX text')
  expect(rendered).toContain('Boxed content')
})
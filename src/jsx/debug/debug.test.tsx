import { test, expect } from "bun:test"
import { jsx } from "../runtime"
import { Effect } from "effect"

test("debug wrapper wraps content when TUIX_DEBUG=true", async () => {
  // Save original env
  const originalDebug = process.env.TUIX_DEBUG
  
  try {
    // Enable debug mode
    process.env.TUIX_DEBUG = 'true'
    
    // Import fresh to get debug behavior
    const { DebugWrapper } = await import('./Wrapper')
    
    // Create simple content
    const content = jsx('text', {}, 'Test content')
    
    // Wrap in debug
    const wrapped = DebugWrapper({ children: content })
    
    // Should return a view
    expect(wrapped).toBeDefined()
    expect(wrapped.render).toBeDefined()
    expect(typeof wrapped.render).toBe('function')
    
    // The debug wrapper should include the debug UI
    const rendered = await Effect.runPromise(wrapped.render())
    expect(rendered).toContain('TUIX DEBUG')
    expect(rendered).toContain('Debug Information')
  } finally {
    // Restore original env
    process.env.TUIX_DEBUG = originalDebug
  }
})
#!/usr/bin/env bun

/**
 * Debug helper for exemplar CLI issues
 */

import { jsx, Plugin, Command } from './src/jsx-app'

// Simple test app that mimics exemplar structure
function TestApp() {
  return (
    <Plugin name="test" description="Test plugin">
      <Command name="dev" description="Development commands">
        <Command name="status" description="Show status">
          <vstack>
            <text color="green">✅ Status is working!</text>
            <text>If you see this, the command executed successfully.</text>
          </vstack>
        </Command>
      </Command>
    </Plugin>
  )
}

console.log('🔍 Testing nested command structure like exemplar...')
console.log('Command: test dev status')

// Run with CLI args
jsx(TestApp).catch(console.error)
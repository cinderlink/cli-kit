#!/usr/bin/env bun

/**
 * MVU Pattern JSX CLI Example
 * 
 * Demonstrates Model-View-Update pattern with the JSX CLI system
 */

import { jsx, App, Command } from '../src/cli/components'
import { Effect } from 'effect'
import { Box, Text, List } from '../src/components'
import type { UIComponent, Cmd, KeyEvent } from '../src/core/types'
import { onMount, onDestroy } from '../src/reactivity/runes'

// Model
type TodoModel = {
  items: string[]
  selected: number
  input: string
}

// Messages
type TodoMsg = 
  | { type: 'AddItem', text: string }
  | { type: 'RemoveSelected' }
  | { type: 'MoveUp' }
  | { type: 'MoveDown' }
  | { type: 'UpdateInput', value: string }

// Todo List Component using MVU pattern
const TodoList = (): UIComponent<TodoModel, TodoMsg> => ({
  // Initialize model
  init: Effect.succeed([
    { items: ['Buy groceries', 'Write documentation', 'Test CLI'], selected: 0, input: '' },
    []
  ]),
  
  // Update function
  update: (msg, model) => Effect.gen(function* () {
    switch (msg.type) {
      case 'AddItem':
        if (msg.text.trim()) {
          return [
            { ...model, items: [...model.items, msg.text.trim()], input: '' },
            []
          ]
        }
        return [model, []]
        
      case 'RemoveSelected':
        const newItems = model.items.filter((_, i) => i !== model.selected)
        return [
          { 
            ...model, 
            items: newItems,
            selected: Math.min(model.selected, newItems.length - 1)
          },
          []
        ]
        
      case 'MoveUp':
        return [
          { ...model, selected: Math.max(0, model.selected - 1) },
          []
        ]
        
      case 'MoveDown':
        return [
          { ...model, selected: Math.min(model.items.length - 1, model.selected + 1) },
          []
        ]
        
      case 'UpdateInput':
        return [{ ...model, input: msg.value }, []]
    }
  }),
  
  // View function
  view: (model) => (
    <Box borderStyle="round">
      <Text bold>Todo List (↑/↓ to navigate, d to delete, a to add)</Text>
      <List
        items={model.items}
        selected={model.selected}
      />
      <Text>Total: {model.items.length} items</Text>
      {model.input && <Text>New item: {model.input}</Text>}
    </Box>
  ),
  
  // Handle keyboard input
  handleKey: (key: KeyEvent, model) => {
    switch (key.name) {
      case 'up':
        return { type: 'MoveUp' }
      case 'down':
        return { type: 'MoveDown' }
      case 'd':
        return { type: 'RemoveSelected' }
      case 'a':
        // In a real app, this would open an input field
        return { type: 'AddItem', text: `New item ${Date.now()}` }
      default:
        return null
    }
  }
})

// Main App
export default jsx(() => (
  <App name="mvu-todo" version="1.0.0" description="MVU pattern todo list">
    <Command 
      name="todos" 
      description="Interactive todo list"
      interactive={true}  // Keep running for interaction
    >
      {() => Effect.succeed(<TodoList />)}
    </Command>
    
    <Command name="add" description="Add a todo item">
      <Arg name="task" description="Task description" required />
      
      {({ args }) => Effect.gen(function* () {
        // In a real app, this would update shared state
        return <Text color="green">Added: {args.task}</Text>
      })}
    </Command>
  </App>
))

// Run with:
// bun examples/mvu-jsx-cli.tsx todos     # Interactive mode
// bun examples/mvu-jsx-cli.tsx add "Buy milk"
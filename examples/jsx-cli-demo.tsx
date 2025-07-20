#!/usr/bin/env bun

/**
 * JSX CLI Demo
 * 
 * Demonstrates how to build a complete CLI app using the Svelte-like JSX CLI system
 */

import { jsx, App, Command, Arg, Option, Help } from '../src/cli/components'
import { Effect } from 'effect'
import { Box, Text, List, Table } from '../src/components'
import { $state, $derived, $effect, onMount, onDestroy } from '../src/reactivity/runes'

// Demo data store using runes
const users = $state<Array<{ id: string; name: string; email: string; role: string }>>([]
)

// Derived state for statistics
const userStats = $derived(() => {
  const total = users.value.length
  const byRole = users.value.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return { total, byRole }
})

// Interactive user list component
const InteractiveUserList = () => {
  const selectedIndex = $state(0)
  const filter = $state('')
  
  const filteredUsers = $derived(() => 
    users.value.filter(u => 
      filter.value === '' || 
      u.name.toLowerCase().includes(filter.value.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.value.toLowerCase())
    )
  )
  
  // Handle keyboard input
  const handleKey = (key: any) => {
    switch (key.name) {
      case 'up':
        selectedIndex.value = Math.max(0, selectedIndex.value - 1)
        break
      case 'down':
        selectedIndex.value = Math.min(filteredUsers.value.length - 1, selectedIndex.value + 1)
        break
      case 'd':
        // Delete selected user
        const userToDelete = filteredUsers.value[selectedIndex.value]
        if (userToDelete) {
          users.value = users.value.filter(u => u.id !== userToDelete.id)
          selectedIndex.value = Math.min(selectedIndex.value, filteredUsers.value.length - 1)
        }
        break
    }
  }
  
  onMount(() => {
    process.stdin.on('keypress', handleKey)
  })
  
  onDestroy(() => {
    process.stdin.off('keypress', handleKey)
  })
  
  return (
    <Box borderStyle="round">
      <Text bold>User Management (↑/↓ navigate, d to delete, q to quit)</Text>
      <Text>Filter: {filter.value || '(type to filter)'}</Text>
      <List
        items={filteredUsers.value.map(u => `${u.name} - ${u.email} (${u.role})`)}
        selected={selectedIndex.value}
      />
      <Text>Total: {filteredUsers.value.length} users</Text>
    </Box>
  )
}

// Main JSX CLI App
export default jsx(() => (
  <App name="user-cli" version="1.0.0" description="User management CLI">
    <Command name="list" description="List all users">
      <Option name="format" alias="f" type="string" default="list" />
      <Option name="interactive" alias="i" type="boolean" />
      
      {({ options }) => Effect.gen(function* () {
        // Load users from storage (mock)
        if (users.value.length === 0) {
          users.value = [
            { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
            { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
            { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
          ]
        }
        
        if (options.interactive) {
          return <InteractiveUserList />
        }
        
        if (options.format === 'table') {
          return (
            <Box>
              <Text bold color="cyan">User List</Text>
              <Table 
                data={users.value}
                columns={['id', 'name', 'email', 'role']}
              />
            </Box>
          )
        }
        
        return (
          <Box>
            <Text bold color="cyan">User List</Text>
            {users.value.map(user => (
              <Text key={user.id}>• {user.name} ({user.email}) - {user.role}</Text>
            ))}
          </Box>
        )
      })}
    </Command>

    <Command name="add" description="Add a new user">
      <Arg name="name" description="User's full name" required />
      <Arg name="email" description="User's email address" required />
      <Option name="role" alias="r" type="string" default="user" />
      
      {({ args, options }) => Effect.gen(function* () {
        // Validate email
        if (!args.email.includes('@')) {
          return <Text color="red">Error: Invalid email address</Text>
        }
        
        const newUser = {
          id: Date.now().toString(),
          name: args.name,
          email: args.email,
          role: options.role || 'user'
        }
        
        users.value = [...users.value, newUser]
        
        return (
          <Box>
            <Text color="green" bold>✅ User added successfully!</Text>
            <Text>ID: {newUser.id}</Text>
            <Text>Name: {newUser.name}</Text>
            <Text>Email: {newUser.email}</Text>
            <Text>Role: {newUser.role}</Text>
          </Box>
        )
      })}
    </Command>

    <Command name="remove" description="Remove a user">
      <Arg name="id" description="User ID to remove" required />
      
      {({ args }) => Effect.gen(function* () {
        const userToRemove = users.value.find(u => u.id === args.id)
        
        if (!userToRemove) {
          return <Text color="red">Error: User with ID {args.id} not found</Text>
        }
        
        users.value = users.value.filter(u => u.id !== args.id)
        
        return (
          <Box>
            <Text color="yellow">User removed:</Text>
            <Text>{userToRemove.name} ({userToRemove.email})</Text>
          </Box>
        )
      })}
    </Command>
    
    <Command name="stats" description="Show user statistics">
      {() => Effect.succeed(
        <Box borderStyle="single">
          <Text bold color="purple">📊 User Statistics</Text>
          <Text>Total users: {userStats.value.total}</Text>
          <Text></Text>
          <Text bold>Users by role:</Text>
          {Object.entries(userStats.value.byRole).map(([role, count]) => (
            <Text key={role}>  {role}: {count}</Text>
          ))}
        </Box>
      )}
    </Command>
    
    <Command name="help" description="Show help">
      {({ config }) => Effect.succeed(
        <Help config={config} showExamples showAliases />
      )}
    </Command>
  </App>
))

// Example usage:
// bun examples/jsx-cli-demo.tsx list
// bun examples/jsx-cli-demo.tsx list --format table
// bun examples/jsx-cli-demo.tsx list --interactive
// bun examples/jsx-cli-demo.tsx add "John Doe" "john@example.com" --role admin
// bun examples/jsx-cli-demo.tsx remove 1
// bun examples/jsx-cli-demo.tsx stats
// bun examples/jsx-cli-demo.tsx help
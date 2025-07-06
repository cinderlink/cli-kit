#!/usr/bin/env bun

/**
 * Simple Runes Demo - Testing the $bindable rune
 */

import { $bindable, $state, $derived } from "../src/reactivity"

// Create bindable values
const name = $bindable('John Doe')
const age = $bindable(25, {
  validate: (value) => value >= 0 && value <= 120 || 'Age must be between 0 and 120',
  transform: (value) => Math.floor(value)
})
const email = $bindable('', {
  validate: (value) => !value || value.includes('@') || 'Invalid email'
})

// Subscribe to changes
name.$subscribe((value) => {
  console.log('Name changed to:', value)
})

age.$subscribe((value) => {
  console.log('Age changed to:', value)
})

email.$subscribe((value) => {
  console.log('Email changed to:', value)
})

// Test the runes
console.log('Initial values:')
console.log('Name:', name())
console.log('Age:', age())
console.log('Email:', email())

console.log('\nUpdating values...')
name.$set('Jane Smith')
age.$set(30)
email.$set('jane@example.com')

console.log('\nNew values:')
console.log('Name:', name())
console.log('Age:', age())
console.log('Email:', email())

// Test validation
console.log('\nTesting validation...')
age.$set(150) // Should be rejected
email.$set('invalid-email') // Should be rejected

console.log('\nValues after validation:')
console.log('Age:', age()) // Should still be 30
console.log('Email:', email()) // Should still be jane@example.com

// Test transform
console.log('\nTesting transform...')
age.$set(25.7) // Should be transformed to 25

console.log('Age after transform:', age())

// Test $update
console.log('\nTesting $update...')
age.$update(current => current + 1)
console.log('Age after update:', age()) // Should be 26
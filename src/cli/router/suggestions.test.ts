/**
 * Command Suggestions Tests
 */

import { describe, it, expect } from 'bun:test'
import { CommandSuggestions } from './suggestions'

describe('CommandSuggestions', () => {
  const mockCommands = ['build', 'test', 'deploy', 'develop', 'bundle']
  const getAvailableCommands = (path: string[]) => mockCommands

  describe('getSuggestions', () => {
    it('should suggest close matches', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestions('buld')
      expect(results).toContain('build')
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should handle exact matches', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestions('build')
      expect(results).toContain('build')
    })

    it('should filter out distant matches', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestions('xyz')
      expect(results.length).toBe(0)
    })

    it('should return top 3 suggestions', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestions('d')
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should handle empty command', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestions('')
      expect(results.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getSuggestionsWithDistance', () => {
    it('should return suggestions with distances', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestionsWithDistance('buld')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('command')
      expect(results[0]).toHaveProperty('distance')
      expect(results[0].command).toBe('build')
      expect(results[0].distance).toBe(1)
    })

    it('should sort by distance', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      const results = suggestions.getSuggestionsWithDistance('dep')

      // Should be sorted by distance
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance)
      }
    })
  })

  describe('levenshteinDistance', () => {
    it('should calculate correct distances', () => {
      const suggestions = new CommandSuggestions(getAvailableCommands)

      // Access private method through getSuggestionsWithDistance
      const getDistance = (s1: string, s2: string) => {
        const results = suggestions.getSuggestionsWithDistance(s1)
        const match = results.find(r => r.command === s2)
        return match?.distance
      }

      // Test various distances
      expect(getDistance('build', 'build')).toBe(0) // Exact match
      expect(getDistance('buld', 'build')).toBe(1) // One insertion
      expect(getDistance('builds', 'build')).toBe(1) // One deletion
      expect(getDistance('guild', 'build')).toBe(1) // One substitution
    })
  })
})

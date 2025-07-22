/**
 * Command Suggestions System
 * 
 * Provides intelligent suggestions for misspelled or unknown commands
 * using Levenshtein distance algorithm
 */

import type { CommandSuggestion } from "./types"

export class CommandSuggestions {
  constructor(
    private getAvailableCommands: (commandPath: string[]) => string[]
  ) {}
  
  /**
   * Get suggestions for a misspelled or unknown command
   */
  getSuggestions(unknownCommand: string, commandPath: string[] = []): string[] {
    const availableCommands = this.getAvailableCommands(commandPath)
    
    // Calculate edit distance and return closest matches
    const suggestions = availableCommands
      .map(cmd => ({
        command: cmd,
        distance: this.levenshteinDistance(unknownCommand, cmd)
      }))
      .filter(item => item.distance <= 3) // Only suggest close matches
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3) // Top 3 suggestions
      .map(item => item.command)
    
    return suggestions
  }
  
  /**
   * Get all suggestions with their distances
   */
  getSuggestionsWithDistance(
    unknownCommand: string, 
    commandPath: string[] = []
  ): CommandSuggestion[] {
    const availableCommands = this.getAvailableCommands(commandPath)
    
    return availableCommands
      .map(cmd => ({
        command: cmd,
        distance: this.levenshteinDistance(unknownCommand, cmd)
      }))
      .filter(item => item.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,     // deletion
          matrix[j - 1]![i]! + 1,     // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length]![str1.length]!
  }
}
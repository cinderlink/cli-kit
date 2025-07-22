/**
 * Value Parsing Utilities
 */

/**
 * Parse a string value to the appropriate type
 * 
 * @param value - String value to parse
 * @returns Parsed value as string, number, or boolean
 */
export function parseValue(value: string): string | number | boolean {
  // Try to parse as number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  
  if (/^-?\d*\.\d+$/.test(value)) {
    return parseFloat(value)
  }
  
  // Try to parse as boolean
  if (value === 'true') return true
  if (value === 'false') return false
  
  // Return as string
  return value
}

/**
 * Add a value to an option, handling multiple values by creating arrays
 * 
 * @param options - Options object to modify
 * @param name - Option name
 * @param value - Value to add
 */
export function addOptionValue(options: Record<string, unknown>, name: string, value: unknown): void {
  if (name in options) {
    // Option already exists - convert to array or append to array
    if (Array.isArray(options[name])) {
      (options[name] as unknown[]).push(value)
    } else {
      options[name] = [options[name], value]
    }
  } else {
    options[name] = value
  }
}
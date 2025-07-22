/**
 * Option Parsing Utilities
 */

import { parseValue, addOptionValue } from "./value"

/**
 * Parse long option (--name or --name=value)
 * 
 * @param arg - Long option string
 * @returns Tuple of [name, value]
 */
export function parseLongOption(arg: string): [string, string | undefined] {
  const equalIndex = arg.indexOf('=')
  if (equalIndex !== -1) {
    return [arg.slice(2, equalIndex), arg.slice(equalIndex + 1)]
  }
  return [arg.slice(2), undefined]
}

/**
 * Parse short options (-abc becomes a=true, b=true, c=true)
 * 
 * @param flags - Short option flags
 * @param options - Options object to modify
 * @param argv - Full argument array
 * @param currentIndex - Current index in argv
 * @returns Number of additional arguments consumed
 */
export function parseShortOptions(
  flags: string, 
  options: Record<string, unknown>,
  argv: string[],
  currentIndex: number
): number {
  let consumed = 0
  
  for (let j = 0; j < flags.length; j++) {
    const flag = flags[j]
    
    // Check if this is the last flag and there's a value
    if (j === flags.length - 1) {
      const nextArg = argv[currentIndex + 1 + consumed]
      if (nextArg && !nextArg.startsWith('-')) {
        addOptionValue(options, flag, parseValue(nextArg))
        consumed++
      } else {
        addOptionValue(options, flag, true)
      }
    } else {
      addOptionValue(options, flag, true)
    }
  }
  
  return consumed
}
/**
 * Schema Validation for Parser
 */

import { z, type ZodTypeAny } from 'zod'
import type { ParsedArgs } from './types'

/**
 * Validate and transform parsed arguments using Zod schemas
 *
 * @param result - Parsed arguments to validate
 * @param optionSchemas - Option schemas
 * @param argSchemas - Argument schemas
 */
export function validateAndTransform(
  result: ParsedArgs,
  optionSchemas: Record<string, ZodTypeAny>,
  argSchemas: Record<string, ZodTypeAny>
): void {
  // Apply default values and validate options
  for (const [name, schema] of Object.entries(optionSchemas)) {
    try {
      if (name in result.options) {
        result.options[name] = schema.parse(result.options[name])
      } else {
        // Apply default if available
        const parsed = schema.parse(undefined)
        if (parsed !== undefined) {
          result.options[name] = parsed
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid option --${name}: ${error.message}`)
      }
      throw error
    }
  }

  // Validate and transform positional arguments
  if (Object.keys(argSchemas).length > 0) {
    const newArgs: Record<string, unknown> = {}
    const argEntries = Object.entries(argSchemas)

    // Map positional args to named args
    argEntries.forEach(([name, schema], index) => {
      const value = result.args[index]

      try {
        if (value !== undefined) {
          newArgs[name] = schema.parse(value)
        } else if (!schema.isOptional()) {
          throw new Error(`Missing required argument: ${name}`)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid argument ${name}: ${error.message}`)
        }
        throw error
      }
    })

    // Check for extra arguments
    const providedCount = Object.keys(result.args).length
    const expectedCount = argEntries.length
    if (providedCount > expectedCount) {
      throw new Error(
        `Too many arguments provided. Expected ${expectedCount}, got ${providedCount}`
      )
    }

    result.args = newArgs
  }
}

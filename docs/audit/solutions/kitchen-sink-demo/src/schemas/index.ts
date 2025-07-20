/**
 * Schema Definitions
 * 
 * Type-safe schema definitions for CLI arguments and data validation.
 * These would be provided by @tuix/schema in the real framework.
 */

import { z } from 'zod'

// Basic CLI schemas
export const cliStringSchema = z.string()
export const cliNumberSchema = z.coerce.number()
export const cliBooleanSchema = z.coerce.boolean()
export const cliArraySchema = z.array(z.string())

// Complex schemas
export const cliFilePathSchema = z.string().refine(
  (path) => path.length > 0,
  { message: 'File path cannot be empty' }
)

export const cliPortSchema = z.coerce.number().int().min(1).max(65535)

export const cliEnumSchema = <T extends string>(values: readonly T[]) => 
  z.enum(values as [T, ...T[]])

// Transformation schemas
export const cliJsonSchema = z.string().transform((str) => {
  try {
    return JSON.parse(str)
  } catch {
    throw new Error('Invalid JSON')
  }
})

export const cliDateSchema = z.string().transform((str) => new Date(str))

// Validation helpers
export function validateSchema<T>(schema: z.ZodSchema<T>, value: unknown): T {
  return schema.parse(value)
}

export function isValidSchema<T>(schema: z.ZodSchema<T>, value: unknown): boolean {
  return schema.safeParse(value).success
}
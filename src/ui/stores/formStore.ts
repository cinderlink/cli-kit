/**
 * Form Store
 *
 * Manages form state for complex forms including:
 * - Field values and metadata
 * - Validation state
 * - Form-wide state (submitting, dirty, touched)
 * - Field dependencies and computed values
 *
 * This store is designed to be instantiated per form,
 * not as a global singleton.
 */

import { $state, $derived, $effect } from '@core/update/reactivity/runes'
import type { StateRune } from '@core/update/reactivity/runes'
import { Effect } from 'effect'

// Types
export type Validator<T = any> = (
  value: T,
  form?: FormValues
) => string | null | Promise<string | null>
export type Transformer<T = any> = (value: T) => T

export interface FieldConfig<T = any> {
  value: T
  validators?: Validator<T>[]
  transformer?: Transformer<T>
  dependsOn?: string[]
  compute?: (form: FormValues) => T
}

export interface FieldState<T = any> {
  value: StateRune<T>
  error: StateRune<string | null>
  touched: StateRune<boolean>
  dirty: StateRune<boolean>
  validating: StateRune<boolean>
  disabled: StateRune<boolean>
}

export type FormConfig = Record<string, FieldConfig>
export type FormFields = Record<string, FieldState>
export type FormValues = Record<string, any>
export type FormErrors = Record<string, string | null>

export interface FormStore {
  // Field states
  fields: FormFields

  // Form-wide state
  isSubmitting: StateRune<boolean>
  submitError: StateRune<string | null>
  submitCount: StateRune<number>

  // Derived state
  values: () => FormValues
  errors: () => FormErrors
  isValid: () => boolean
  isDirty: () => boolean
  isTouched: () => boolean
  isValidating: () => boolean
  dirtyFields: () => string[]
  touchedFields: () => string[]

  // Methods
  setFieldValue: <T>(name: string, value: T) => void
  setFieldError: (name: string, error: string | null) => void
  setFieldTouched: (name: string, touched?: boolean) => void
  setFieldDisabled: (name: string, disabled: boolean) => void
  setValues: (values: Partial<FormValues>) => void
  validateField: (name: string) => Promise<string | null>
  validateForm: () => Promise<FormErrors>
  resetField: (name: string) => void
  resetForm: () => void
  handleSubmit: (onSubmit: (values: FormValues) => void | Promise<void>) => () => Promise<void>
  getFieldProps: (name: string) => {
    value: any
    error: string | null
    touched: boolean
    disabled: boolean
    onChange: (value: any) => void
    onBlur: () => void
  }
}

/**
 * Create a new Form store instance
 */
export function createFormStore<T extends FormConfig>(config: T): FormStore {
  const fieldConfigs = config
  const initialValues: FormValues = {}

  // Create field states
  const fields: FormFields = {}

  for (const [name, fieldConfig] of Object.entries(fieldConfigs)) {
    const computedValue = fieldConfig.compute
      ? fieldConfig.compute(initialValues)
      : fieldConfig.value

    fields[name] = {
      value: $state(computedValue),
      error: $state<string | null>(null),
      touched: $state(false),
      dirty: $state(false),
      validating: $state(false),
      disabled: $state(false),
    }

    initialValues[name] = computedValue
  }

  // Form-wide state
  const isSubmitting = $state(false)
  const submitError = $state<string | null>(null)
  const submitCount = $state(0)

  // Derived state
  const values = $derived(() => {
    const formValues: FormValues = {}
    for (const [name, field] of Object.entries(fields)) {
      formValues[name] = field.value()
    }
    return formValues
  })

  const errors = $derived(() => {
    const formErrors: FormErrors = {}
    for (const [name, field] of Object.entries(fields)) {
      formErrors[name] = field.error()
    }
    return formErrors
  })

  const isValid = $derived(() => {
    return Object.values(errors()).every(error => error === null)
  })

  const isDirty = $derived(() => {
    return Object.values(fields).some(field => field.dirty())
  })

  const isTouched = $derived(() => {
    return Object.values(fields).some(field => field.touched())
  })

  const isValidating = $derived(() => {
    return Object.values(fields).some(field => field.validating())
  })

  const dirtyFields = $derived(() => {
    return Object.entries(fields)
      .filter(([_, field]) => field.dirty())
      .map(([name]) => name)
  })

  const touchedFields = $derived(() => {
    return Object.entries(fields)
      .filter(([_, field]) => field.touched())
      .map(([name]) => name)
  })

  // Setup field dependencies
  for (const [name, config] of Object.entries(fieldConfigs)) {
    if (config.dependsOn && config.compute) {
      $effect(() => {
        const currentValues = values()
        const shouldUpdate = config.dependsOn!.some(dep => fields[dep]?.value() !== undefined)

        if (shouldUpdate) {
          const computed = config.compute!(currentValues)
          const field = fields[name]
          if (field && field.value() !== computed) {
            field.value.$set(computed)
          }
        }
      })
    }
  }

  // Methods
  const setFieldValue = <T>(name: string, value: T) => {
    const field = fields[name]
    if (!field) return

    const config = fieldConfigs[name]
    const transformed = config?.transformer ? config.transformer(value) : value

    field.value.$set(transformed)
    field.dirty.$set(true)

    // Clear error on value change
    field.error.$set(null)

    // Trigger validation if field was touched
    if (field.touched()) {
      validateField(name)
    }
  }

  const setFieldError = (name: string, error: string | null) => {
    const field = fields[name]
    if (!field) return

    field.error.$set(error)
  }

  const setFieldTouched = (name: string, touched = true) => {
    const field = fields[name]
    if (!field) return

    field.touched.$set(touched)

    // Validate on touch
    if (touched) {
      validateField(name)
    }
  }

  const setFieldDisabled = (name: string, disabled: boolean) => {
    const field = fields[name]
    if (!field) return

    field.disabled.$set(disabled)
  }

  const setValues = (newValues: Partial<FormValues>) => {
    for (const [name, value] of Object.entries(newValues)) {
      setFieldValue(name, value)
    }
  }

  const validateField = async (name: string): Promise<string | null> => {
    const field = fields[name]
    const config = fieldConfigs[name]

    if (!field || !config || !config.validators) return null

    field.validating.$set(true)

    try {
      const currentValues = values()
      const fieldValue = field.value()

      for (const validator of config.validators) {
        const error = await validator(fieldValue, currentValues)
        if (error) {
          field.error.$set(error)
          field.validating.$set(false)
          return error
        }
      }

      field.error.$set(null)
      field.validating.$set(false)
      return null
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Validation failed'
      field.error.$set(error)
      field.validating.$set(false)
      return error
    }
  }

  const validateForm = async (): Promise<FormErrors> => {
    const validationPromises = Object.keys(fields).map(name =>
      validateField(name).then(error => ({ name, error }))
    )

    const results = await Promise.all(validationPromises)
    const formErrors: FormErrors = {}

    for (const { name, error } of results) {
      formErrors[name] = error
    }

    return formErrors
  }

  const resetField = (name: string) => {
    const field = fields[name]
    const config = fieldConfigs[name]

    if (!field || !config) return

    const initialValue = config.compute ? config.compute(initialValues) : config.value

    field.value.$set(initialValue)
    field.error.$set(null)
    field.touched.$set(false)
    field.dirty.$set(false)
    field.validating.$set(false)
    field.disabled.$set(false)
  }

  const resetForm = () => {
    for (const name of Object.keys(fields)) {
      resetField(name)
    }

    isSubmitting.$set(false)
    submitError.$set(null)
    submitCount.$set(0)
  }

  const handleSubmit = (onSubmit: (values: FormValues) => void | Promise<void>) => {
    return async () => {
      // Touch all fields
      for (const field of Object.values(fields)) {
        field.touched.$set(true)
      }

      // Validate all fields
      const errors = await validateForm()
      const hasErrors = Object.values(errors).some(error => error !== null)

      if (hasErrors) {
        return
      }

      isSubmitting.$set(true)
      submitError.$set(null)

      try {
        await onSubmit(values())
        submitCount.$set(submitCount() + 1)
      } catch (err) {
        submitError.$set(err instanceof Error ? err.message : 'Submit failed')
      } finally {
        isSubmitting.$set(false)
      }
    }
  }

  const getFieldProps = (name: string) => {
    const field = fields[name]

    return {
      value: field?.value(),
      error: field?.error() || null,
      touched: field?.touched() || false,
      disabled: field?.disabled() || false,
      onChange: (value: any) => setFieldValue(name, value),
      onBlur: () => setFieldTouched(name),
    }
  }

  return {
    fields,
    isSubmitting,
    submitError,
    submitCount,
    values,
    errors,
    isValid,
    isDirty,
    isTouched,
    isValidating,
    dirtyFields,
    touchedFields,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setFieldDisabled,
    setValues,
    validateField,
    validateForm,
    resetField,
    resetForm,
    handleSubmit,
    getFieldProps,
  }
}

/**
 * Common form validators
 */
export const formValidators = {
  required:
    (message = 'This field is required'): Validator =>
    value => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      if (typeof value === 'string' && !value.trim()) {
        return message
      }
      return null
    },

  email:
    (message = 'Invalid email address'): Validator<string> =>
    value =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message,

  minLength:
    (min: number, message?: string): Validator<string> =>
    value =>
      value.length >= min ? null : message || `Must be at least ${min} characters`,

  maxLength:
    (max: number, message?: string): Validator<string> =>
    value =>
      value.length <= max ? null : message || `Must be at most ${max} characters`,

  pattern:
    (regex: RegExp, message = 'Invalid format'): Validator<string> =>
    value =>
      regex.test(value) ? null : message,

  min:
    (min: number, message?: string): Validator<number> =>
    value =>
      value >= min ? null : message || `Must be at least ${min}`,

  max:
    (max: number, message?: string): Validator<number> =>
    value =>
      value <= max ? null : message || `Must be at most ${max}`,

  matches:
    (fieldName: string, message = 'Fields must match'): Validator =>
    (value, form) => {
      if (!form) return null
      return value === form[fieldName] ? null : message
    },

  unique:
    (existingValues: any[], message = 'This value already exists'): Validator =>
    value =>
      existingValues.includes(value) ? message : null,

  custom:
    <T>(fn: (value: T, form?: FormValues) => boolean, message: string): Validator<T> =>
    (value, form) =>
      fn(value, form) ? null : message,
}

/**
 * Form field transformers
 */
export const formTransformers = {
  trim: (value: string) => value.trim(),
  uppercase: (value: string) => value.toUpperCase(),
  lowercase: (value: string) => value.toLowerCase(),
  number: (value: string) => {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  },
  boolean: (value: any) => !!value,
  date: (value: string) => new Date(value),
  json: (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  },
}

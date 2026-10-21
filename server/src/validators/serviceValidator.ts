
import type { Priority } from '../models/service'

export interface ServiceInput {
  name: string
  description: string
  duration: number
  priority: Priority
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateServiceInput(
  input: unknown,
): ValidationResult {
  const errors: string[] = []

  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return {
      valid: false,
      errors: ['Request body must be an object.'],
    }
  }

  const data = input as Record<string, unknown>

  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Service name is required.')
  } else if (data.name.trim().length > 100) {
    errors.push('Service name must be 100 characters or less.')
  }

  if (
    typeof data.description !== 'string' ||
    !data.description.trim()
  ) {
    errors.push('Description is required.')
  }

  if (
    typeof data.duration !== 'number' ||
    !Number.isFinite(data.duration) ||
    data.duration <= 0
  ) {
    errors.push('Duration must be a positive number.')
  }

  if (
    data.priority !== 'low' &&
    data.priority !== 'medium' &&
    data.priority !== 'high'
  ) {
    errors.push('Priority must be low, medium, or high.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
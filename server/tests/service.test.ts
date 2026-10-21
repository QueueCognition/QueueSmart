
import { describe, it, expect } from 'vitest'
import { ServiceService } from '../src/services/serviceService'
import { validateServiceInput } from '../src/validators/serviceValidator'

describe('Service Management', () => {
  it('lists the initial services', () => {
    const serviceService = new ServiceService()

    expect(serviceService.listServices()).toHaveLength(3)
  })

  it('creates a valid service', () => {
    const serviceService = new ServiceService()

    const service = serviceService.createService({
      name: 'Passport Services',
      description: 'Passport application assistance.',
      duration: 25,
      priority: 'high',
    })

    expect(service.id).toBe(4)
    expect(service.name).toBe('Passport Services')
    expect(service.priority).toBe('high')
  })

  it('rejects a blank service name', () => {
    const result = validateServiceInput({
      name: ' ',
      description: 'Valid description',
      duration: 20,
      priority: 'medium',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Service name is required.')
  })

  it('rejects a service name longer than 100 characters', () => {
    const result = validateServiceInput({
      name: 'A'.repeat(101),
      description: 'Valid description',
      duration: 20,
      priority: 'medium',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Service name must be 100 characters or less.',
    )
  })

  it('rejects a non-positive duration', () => {
    const result = validateServiceInput({
      name: 'Passport Services',
      description: 'Valid description',
      duration: -5,
      priority: 'medium',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Duration must be a positive number.',
    )
  })

  it('rejects an invalid priority', () => {
    const result = validateServiceInput({
      name: 'Passport Services',
      description: 'Valid description',
      duration: 20,
      priority: 'urgent',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'Priority must be low, medium, or high.',
    )
  })

  it('updates an existing service', () => {
    const serviceService = new ServiceService()

    const updated = serviceService.updateService(1, {
      name: 'Updated Student ID',
      description: 'Updated ID card service.',
      duration: 10,
      priority: 'low',
    })

    expect(updated?.name).toBe('Updated Student ID')
    expect(serviceService.listServices()[0]?.duration).toBe(10)
  })

  it('returns undefined when updating a nonexistent service', () => {
    const serviceService = new ServiceService()

    expect(
      serviceService.updateService(999, {
        name: 'Unknown',
        description: 'Unknown service',
        duration: 10,
        priority: 'low',
      }),
    ).toBeUndefined()
  })
})
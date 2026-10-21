
import type { Request, Response } from 'express'
import { ServiceService } from '../services/serviceService'

export function createServiceController(serviceService: ServiceService) {
  function listServices(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: serviceService.listServices(),
    })
  }

  function createService(req: Request, res: Response): void {
    try {
      const service = serviceService.createService(req.body)

      res.status(201).json({
        success: true,
        data: service,
      })
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : 'Invalid service input.',
        ],
      })
    }
  }

  function updateService(req: Request, res: Response): void {
    const id = Number(req.params.id)

    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        errors: ['Service ID must be a positive integer.'],
      })
      return
    }

    try {
      const service = serviceService.updateService(id, req.body)

      if (!service) {
        res.status(404).json({
          success: false,
          errors: ['Service not found.'],
        })
        return
      }

      res.status(200).json({
        success: true,
        data: service,
      })
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : 'Invalid service input.',
        ],
      })
    }
  }

    function removeService(req: Request, res: Response): void {
    const id = Number(req.params.id)

    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        errors: ['Service ID must be a positive integer.'],
      })
      return
    }

    const removed = serviceService.removeService(id)

    if (!removed) {
      res.status(404).json({
        success: false,
        errors: ['Service not found.'],
      })
      return
    }

    res.status(200).json({
      success: true,
      data: { message: 'Service deleted successfully.' },
    })
  }

  return {
  listServices,
  createService,
  updateService,
  removeService,
  }
}
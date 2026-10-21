
import { Router } from 'express'
import { ServiceService } from '../services/serviceService'
import { createServiceController } from '../controllers/serviceController'

export function createServiceRoutes(serviceService: ServiceService) {
  const router = Router()
  const controller = createServiceController(serviceService)

  router.get('/', controller.listServices)
  router.post('/', controller.createService)
  router.put('/:id', controller.updateService)
  router.delete('/:id', controller.removeService)

  return router
}
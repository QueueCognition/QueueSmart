
import express from 'express'
import { ServiceService } from './services/serviceService'
import { createServiceRoutes } from './routes/serviceRoutes'

export function createApp() {
  const app = express()
  const serviceService = new ServiceService()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.use('/api/services', createServiceRoutes(serviceService))

  return app
}
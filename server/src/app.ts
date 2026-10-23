
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import { ServiceService } from './services/serviceService'
import { createServiceRoutes } from './routes/serviceRoutes'
import { apiRouter } from './routes'

export function createApp(): express.Express {
  const app = express()
  const serviceService = new ServiceService()

  app.use(helmet())
  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.use('/api/services', createServiceRoutes(serviceService))
  app.use(config.apiPrefix, apiRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
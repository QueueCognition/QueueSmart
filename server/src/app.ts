
import express from 'express'
import cors from 'cors'
import { ServiceService } from './services/serviceService'
import { createServiceRoutes } from './routes/serviceRoutes'

export function createApp() {
  const app = express()
  const serviceService = new ServiceService()

  // Allow requests from the local Vite frontend.
  app.use(
    cors({
      origin: 'http://localhost:5173',
    }),
  )

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.use('/api/services', createServiceRoutes(serviceService))

  return app
}
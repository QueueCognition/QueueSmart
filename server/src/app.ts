import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { seedDemoQueue } from "./db/seed";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { ServiceService } from "./services/serviceService";
import { QueueService } from "./services/queueService";
import { createQueueCatalog } from "./services/queueCatalog";
import { createServiceRoutes } from "./routes/serviceRoutes";
import { createNotificationRoutes } from './routes/notificationRoutes'
import {
  createAdminQueueRoutes,
  createQueueRoutes,
} from "./routes/queueRoutes";
import { apiRouter } from "./routes";

interface AppOptions {
  seedDemoQueue?: boolean;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const serviceService = new ServiceService();
  const queueService = new QueueService(createQueueCatalog(serviceService));

  if (options.seedDemoQueue) {
    const demoService = serviceService
      .listServices()
      .find((service) => service.name === "Financial Aid Consultation");

    if (demoService) {
      seedDemoQueue(queueService, String(demoService.id)).catch(
        (error: unknown) => {
          console.error("Failed to seed demo queue", error);
        },
      );
    }
  }

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/services", createServiceRoutes(serviceService));
  app.use(`${config.apiPrefix}/queue`, createQueueRoutes(queueService));
  app.use(
    `${config.apiPrefix}/admin/queues`,
    createAdminQueueRoutes(queueService),
  );
  app.use(
    `${config.apiPrefix}/notifications`,
    createNotificationRoutes(),
  );
  app.use(config.apiPrefix, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

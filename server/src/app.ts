import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { ServiceService } from "./services/serviceService";
import { QueueService } from "./services/queueService";
import { createQueueCatalog } from "./services/queueCatalog";
import { createServiceRoutes } from "./routes/serviceRoutes";
import { createNotificationRoutes } from "./routes/notificationRoutes";
import {
  createAdminQueueRoutes,
  createQueueRoutes,
} from "./routes/queueRoutes";
import { apiRouter } from "./routes";

export interface AppOptions {
  apiPrefix?: string;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const apiPrefix = options.apiPrefix ?? config.apiPrefix;
  const serviceService = new ServiceService();
  const queueService = new QueueService(createQueueCatalog(serviceService));

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(`${apiPrefix}/services`, createServiceRoutes(serviceService));
  app.use(`${apiPrefix}/queue`, createQueueRoutes(queueService));
  app.use(`${apiPrefix}/admin/queues`, createAdminQueueRoutes(queueService));
  app.use(`${apiPrefix}/notifications`, createNotificationRoutes());
  app.use(apiPrefix, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

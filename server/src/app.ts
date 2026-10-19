import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiRouter } from "./routes";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.use(config.apiPrefix, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

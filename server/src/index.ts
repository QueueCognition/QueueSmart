import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { seedMockAccounts } from "./db/seed";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiRouter } from "./routes";

seedMockAccounts();

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

app.use(config.apiPrefix, apiRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port);

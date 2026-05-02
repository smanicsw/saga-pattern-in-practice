import express from "express";
import { pinoHttp } from "pino-http";

import { SERVICE_API_PREFIX } from "./constants/index.js";
import { logger } from "./infrastructure/adapters/logger/index.js";
import { apiRoutes } from "./routes/api/index.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(SERVICE_API_PREFIX, apiRoutes);

  return app;
}

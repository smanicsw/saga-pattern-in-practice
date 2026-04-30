import express from "express";
import { pinoHttp } from "pino-http";

import { logger } from "./infrastructure/adapters/logger/index.js";
import { apiRoutes } from "./routes/api/index.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(apiRoutes);

  return app;
}

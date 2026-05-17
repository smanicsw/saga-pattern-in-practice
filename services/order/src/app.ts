import { createErrorHandler } from "@saga/http-kit";
import express from "express";
import { pinoHttp } from "pino-http";

import { SERVICE_API_PREFIX } from "./constants/index.js";
import { logger } from "./infrastructure/adapters/logger/index.js";
import { apiRoutes } from "./routes/api/index.js";
import { registerTypeboxFormats } from "./routes/schemas/register-formats.js";

registerTypeboxFormats();

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.split("?")[0]?.endsWith("/health") === true,
      },
    }),
  );
  app.use(SERVICE_API_PREFIX, apiRoutes);
  app.use(createErrorHandler());

  return app;
}

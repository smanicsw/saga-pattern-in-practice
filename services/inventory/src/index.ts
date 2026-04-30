import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./infrastructure/adapters/database/index.js";
import { logger } from "./infrastructure/adapters/logger/index.js";

await connectDatabase();

const app = createApp();

const server = app.listen(config.INVENTORY_SERVICE_PORT, () => {
  logger.info(
    { port: config.INVENTORY_SERVICE_PORT },
    "inventory service listening"
  );
});

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "shutting down inventory service");

  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled promise rejection");
  void shutdown("SIGTERM");
});

import { createApp } from "./app.js";
import { config } from "./config.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./infrastructure/adapters/database/index.js";
import { logger } from "./infrastructure/adapters/logger/index.js";

async function main() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.INVENTORY_SERVICE_PORT, () => {
    logger.info(
      { port: config.INVENTORY_SERVICE_PORT },
      "inventory service listening",
    );
  });

  async function shutdown({ signal }: { signal: NodeJS.Signals }) {
    logger.info({ signal }, "shutting down inventory service");

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", (signal) => {
    void shutdown({ signal });
  });
  
  process.on("SIGTERM", (signal) => {
    void shutdown({ signal });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "unhandled promise rejection");
    void shutdown({ signal: "SIGTERM" });
  });
}

main().catch((error) => {
  logger.error({ error }, "failed to start inventory service");
  process.exit(1);
});

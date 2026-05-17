import {
  buildFailedPublishUpdate,
  calculateNextAttemptAt,
  createOutboxWorker,
} from "@saga/outbox-kit";

import {
  connectDatabase,
  disconnectDatabase,
  withTransaction,
} from "../infrastructure/adapters/database/index.js";
import { logger } from "../infrastructure/adapters/logger/index.js";
import * as eventPublisher from "../infrastructure/adapters/message-broker/event-publisher.js";
import * as outboxEventRepository from "../repositories/outbox-event.repository.js";

const worker = createOutboxWorker({
  serviceName: "order",
  topic: "outbox-events.order",
  connectDatabase,
  disconnectDatabase,
  withTransaction,
  repository: outboxEventRepository,
  publisher: eventPublisher,
  logger,
});

export { buildFailedPublishUpdate, calculateNextAttemptAt };

export const processPendingOutboxEvents = worker.processPendingOutboxEvents;
export const startOutboxWorker = worker.startOutboxWorker;

function registerShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info({ signal }, "stopping order outbox worker");
      worker.stopOutboxWorker();
    });
  }
}

if (isDirectRun()) {
  registerShutdownHandlers();

  startOutboxWorker().catch((error) => {
    logger.error({ error }, "failed to start order outbox worker");
    process.exit(1);
  });
}

function isDirectRun(): boolean {
  const executedFilePath = process.argv[1];

  return (
    executedFilePath?.endsWith("src/outbox/worker.ts") === true ||
    executedFilePath?.endsWith("dist/outbox/worker.js") === true
  );
}

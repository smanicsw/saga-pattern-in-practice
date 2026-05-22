import {
  createKafkaEventConsumer,
  type KafkaEventHandler,
} from "@saga/outbox-kit";

import { config } from "../config.js";
import {
  InventoryEventType,
  OrderEventType,
  PaymentEventType,
} from "../entities/index.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "../infrastructure/adapters/database/index.js";
import { logger } from "../infrastructure/adapters/logger/index.js";
import { buildInboxBackedHandlers } from "../inbox/inbox-event.manager.js";
import { handleOrderCancelled } from "./handlers/order-cancelled.handler.js";
import { handleOrderConfirmed } from "./handlers/order-confirmed.handler.js";
import { handleOrderCreated } from "./handlers/order-created.handler.js";
import { handlePaymentAuthorized } from "./handlers/payment-authorized.handler.js";
import { handlePaymentFailed } from "./handlers/payment-failed.handler.js";
import { handleReservationConfirmed } from "./handlers/reservation-confirmed.handler.js";
import { handleReservationCreated } from "./handlers/reservation-created.handler.js";

const SUBSCRIBED_TOPICS = [
  "outbox-events.order",
  "outbox-events.inventory",
  "outbox-events.payments",
] as const;

const orchestrationHandlers = {
  [OrderEventType.Created]: handleOrderCreated,
  [OrderEventType.Confirmed]: handleOrderConfirmed,
  [OrderEventType.Cancelled]: handleOrderCancelled,
  [InventoryEventType.ReservationCreated]: handleReservationCreated,
  [PaymentEventType.Authorized]: handlePaymentAuthorized,
  [PaymentEventType.Failed]: handlePaymentFailed,
  [InventoryEventType.ReservationConfirmed]: handleReservationConfirmed,
} satisfies Record<string, KafkaEventHandler>;

const consumer = createKafkaEventConsumer({
  brokers: config.KAFKA_BROKERS,
  clientId: "order-saga-worker",
  groupId: config.KAFKA_ORDER_SAGA_GROUP_ID,
  topics: [...SUBSCRIBED_TOPICS],
  handlers: buildInboxBackedHandlers({
    handlers: orchestrationHandlers,
  }),
  fromBeginning: true,
  logger,
});

export async function startOrchestratorWorker(): Promise<void> {
  await connectDatabase();
  await consumer.start();
}

export async function stopOrchestratorWorker(): Promise<void> {
  await consumer.stop();
  await disconnectDatabase();
}

function registerShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info({ signal }, "stopping order saga worker");

      stopOrchestratorWorker().catch((error) => {
        logger.error({ error }, "failed to stop order saga worker");
        process.exit(1);
      });
    });
  }
}

if (isDirectRun()) {
  registerShutdownHandlers();

  startOrchestratorWorker().catch((error) => {
    logger.error({ error }, "failed to start order saga worker");
    process.exit(1);
  });
}

function isDirectRun(): boolean {
  const executedFilePath = process.argv[1];

  return (
    executedFilePath?.endsWith("src/orchestrator/worker.ts") === true ||
    executedFilePath?.endsWith("dist/orchestrator/worker.js") === true
  );
}

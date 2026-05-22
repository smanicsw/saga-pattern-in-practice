import type { OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as paymentsRepository from "../repositories/payments.repository.js";
import { buildCausalMetadata } from "./causal-metadata.js";
import { getErrorMessage } from "./orchestration-error.js";
import { markOrderSagaFailed } from "./order-saga-state.js";

export async function compensateAuthorizedPaymentFailure({
  error,
  event,
  orderId,
  paymentId,
  reservationId,
}: {
  error: unknown;
  event: OutboxEvent;
  orderId: string;
  paymentId: string;
  reservationId: string;
}): Promise<void> {
  await paymentsRepository.refund({
    paymentId,
    refundPaymentInput: {
      reason: "ORDER_SAGA_FAILED",
    },
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await inventoryRepository.releaseReservation({
    reservationId,
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await orderRepository.cancelOne({
    orderId,
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await markOrderSagaFailed({
    error,
    orderId,
  });
}

export async function cancelOrderAfterFailedReservation({
  error,
  event,
  orderId,
}: {
  error: unknown;
  event: OutboxEvent;
  orderId: string;
}): Promise<void> {
  await orderRepository.cancelOne({
    orderId,
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await markOrderSagaFailed({
    error,
    orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId,
      reason: getErrorMessage({ error }),
    },
    "order saga cancelled order because inventory reservation was rejected",
  );
}

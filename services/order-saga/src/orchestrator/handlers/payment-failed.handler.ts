import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../../repositories/inventory.repository.js";
import * as orderRepository from "../../repositories/order.repository.js";
import * as orderSagaRepository from "../../repositories/order-saga.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { assertPaymentFailedEvent } from "../event-guards.js";
import { markOrderSagaFailed } from "../order-saga-state.js";

export async function handlePaymentFailed({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertPaymentFailedEvent(event);

  const { payment } = event.payload;
  const order = await findOrderOrThrow({ orderId: payment.orderId });
  const orderSaga = await orderSagaRepository.findOneByOrderId({
    orderId: payment.orderId,
  });

  if (orderSaga?.reservationId) {
    await inventoryRepository.releaseReservation({
      reservationId: orderSaga.reservationId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  }

  if (order.status === "PENDING") {
    await orderRepository.cancelOne({
      orderId: payment.orderId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  }

  await markOrderSagaFailed({
    error: new Error("Payment authorization failed."),
    orderId: payment.orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga?.reservationId ?? null,
    },
    "order saga compensated failed payment",
  );
}

async function findOrderOrThrow({ orderId }: { orderId: string }) {
  const order = await orderRepository.findOne({ orderId });

  if (!order) {
    throw new Error("Order was not found while handling payment failed event.");
  }

  return order;
}

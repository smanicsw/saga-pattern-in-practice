import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../../repositories/inventory.repository.js";
import * as orderRepository from "../../repositories/order.repository.js";
import * as orderSagaRepository from "../../repositories/order-saga.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { compensateAuthorizedPaymentFailure } from "../compensation.js";
import { assertPaymentAuthorizedEvent } from "../event-guards.js";
import { markOrderSagaPaymentAuthorized } from "../order-saga-state.js";

export async function handlePaymentAuthorized({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertPaymentAuthorizedEvent(event);

  const { payment } = event.payload;
  const order = await findOrderOrThrow({ orderId: payment.orderId });
  const orderSaga = await orderSagaRepository.findOneByOrderId({
    orderId: payment.orderId,
  });

  if (!orderSaga?.reservationId) {
    throw new Error(
      "Order saga reservation is missing for authorized payment.",
    );
  }

  if (order.status === "CANCELLED") {
    await compensateAuthorizedPaymentFailure({
      error: new Error(
        "Order was cancelled before payment authorization completed.",
      ),
      event,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    });

    return;
  }

  if (order.status === "CONFIRMED") {
    logger.info(
      {
        eventId: event.id,
        orderId: payment.orderId,
        orderStatus: order.status,
      },
      "order saga skipped payment authorized event because order is already confirmed",
    );

    return;
  }

  await markOrderSagaPaymentAuthorized({
    orderId: payment.orderId,
    paymentId: payment.id,
  });

  try {
    await inventoryRepository.confirmReservation({
      reservationId: orderSaga.reservationId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  } catch (error) {
    await compensateAuthorizedPaymentFailure({
      error,
      event,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    });

    throw error;
  }

  logger.info(
    {
      eventId: event.id,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    },
    "order saga requested reservation confirmation",
  );
}

async function findOrderOrThrow({ orderId }: { orderId: string }) {
  const order = await orderRepository.findOne({ orderId });

  if (!order) {
    throw new Error(
      "Order was not found while handling payment authorized event.",
    );
  }

  return order;
}

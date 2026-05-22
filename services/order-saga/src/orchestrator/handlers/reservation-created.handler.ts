import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as orderRepository from "../../repositories/order.repository.js";
import * as paymentsRepository from "../../repositories/payments.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { assertReservationCreatedEvent } from "../event-guards.js";
import {
  createOrderSagaIfNeeded,
  markOrderSagaReservationCreated,
} from "../order-saga-state.js";

export async function handleReservationCreated({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertReservationCreatedEvent(event);

  const reservation = event.payload.current;
  const order = await findOrderOrThrow({ orderId: reservation.orderId });

  if (order.status !== "PENDING") {
    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        orderStatus: order.status,
        reservationId: reservation.id,
      },
      "order saga skipped reservation created event because order is no longer pending",
    );

    return;
  }

  const orderSaga = await createOrderSagaIfNeeded({
    orderId: reservation.orderId,
  });

  if (!orderSaga.reservationId) {
    await markOrderSagaReservationCreated({
      orderId: reservation.orderId,
      reservationId: reservation.id,
    });
  }

  if (orderSaga.paymentId) {
    logger.info(
      {
        eventId: event.id,
        orderId: reservation.orderId,
        paymentId: orderSaga.paymentId,
      },
      "order saga skipped payment authorization because payment already exists",
    );

    return;
  }

  await paymentsRepository.authorize({
    authorizePaymentInput: {
      orderId: order.id,
      amount: order.totalAmount,
      currency: order.currency,
      paymentMethodToken: orderSaga.paymentMethodToken ?? undefined,
    },
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  logger.info(
    {
      eventId: event.id,
      orderId: order.id,
      reservationId: reservation.id,
    },
    "order saga requested payment authorization",
  );
}

async function findOrderOrThrow({ orderId }: { orderId: string }) {
  const order = await orderRepository.findOne({ orderId });

  if (!order) {
    throw new Error(
      "Order was not found while handling reservation created event.",
    );
  }

  return order;
}

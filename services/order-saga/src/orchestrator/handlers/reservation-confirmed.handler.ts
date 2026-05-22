import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as orderRepository from "../../repositories/order.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { assertReservationConfirmedEvent } from "../event-guards.js";
import {
  markOrderSagaCompleted,
  markOrderSagaFailed,
  markOrderSagaReservationConfirmed,
} from "../order-saga-state.js";

export async function handleReservationConfirmed({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertReservationConfirmedEvent(event);

  const { reservation } = event.payload;
  const order = await findOrderOrThrow({ orderId: reservation.orderId });

  await markOrderSagaReservationConfirmed({
    orderId: reservation.orderId,
  });

  if (order.status === "PENDING") {
    await orderRepository.confirmOne({
      orderId: reservation.orderId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  } else if (order.status !== "CONFIRMED") {
    await markOrderSagaFailed({
      error: new Error(
        `Reservation was confirmed after order moved to ${order.status}.`,
      ),
      orderId: reservation.orderId,
    });

    logger.info(
      {
        eventId: event.id,
        orderId: reservation.orderId,
        orderStatus: order.status,
        reservationId: reservation.id,
      },
      "order saga skipped reservation confirmed event because order cannot be confirmed",
    );

    return;
  }

  await markOrderSagaCompleted({
    orderId: reservation.orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId: reservation.orderId,
      reservationId: reservation.id,
    },
    "order saga completed",
  );
}

async function findOrderOrThrow({ orderId }: { orderId: string }) {
  const order = await orderRepository.findOne({ orderId });

  if (!order) {
    throw new Error(
      "Order was not found while handling reservation confirmed event.",
    );
  }

  return order;
}

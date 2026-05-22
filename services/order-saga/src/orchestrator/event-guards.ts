import type { OutboxEvent } from "@saga/outbox-kit";

import type {
  OrderCancelledPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  PaymentAuthorizedPayload,
  PaymentFailedPayload,
  ReservationConfirmedPayload,
  ReservationCreatedPayload,
} from "../entities/index.js";
import {
  InventoryEventType,
  OrderEventType,
  PaymentEventType,
} from "../entities/index.js";

export function assertOrderCreatedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderCreatedPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Created ||
    !isOrderCreatedPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order created event.");
  }
}

export function assertOrderConfirmedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderConfirmedPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Confirmed ||
    !isOrderStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order confirmed event.");
  }
}

export function assertOrderCancelledEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderCancelledPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Cancelled ||
    !isOrderStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order cancelled event.");
  }
}

export function assertReservationCreatedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<ReservationCreatedPayload, "inventory"> {
  if (
    event.service !== "inventory" ||
    event.type !== InventoryEventType.ReservationCreated ||
    !isReservationCreatedPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid reservation created event.");
  }
}

export function assertReservationConfirmedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<ReservationConfirmedPayload, "inventory"> {
  if (
    event.service !== "inventory" ||
    event.type !== InventoryEventType.ReservationConfirmed ||
    !isReservationStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid reservation confirmed event.");
  }
}

export function assertPaymentAuthorizedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<PaymentAuthorizedPayload, "payments"> {
  if (
    event.service !== "payments" ||
    event.type !== PaymentEventType.Authorized ||
    !isPaymentStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid payment authorized event.");
  }
}

export function assertPaymentFailedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<PaymentFailedPayload, "payments"> {
  if (
    event.service !== "payments" ||
    event.type !== PaymentEventType.Failed ||
    !isPaymentStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid payment failed event.");
  }
}

function isOrderCreatedPayload(
  payload: unknown,
): payload is OrderCreatedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "current" in payload &&
    typeof (payload as { current?: unknown }).current === "object" &&
    (payload as { current?: unknown }).current !== null &&
    "id" in (payload as { current: Record<string, unknown> }).current &&
    typeof (payload as { current: { id?: unknown } }).current.id === "string" &&
    "items" in (payload as { current: Record<string, unknown> }).current &&
    Array.isArray(
      (payload as { current: { items?: unknown } }).current.items,
    ) &&
    (!("paymentMethodToken" in payload) ||
      typeof (payload as { paymentMethodToken?: unknown })
        .paymentMethodToken === "string" ||
      (payload as { paymentMethodToken?: unknown }).paymentMethodToken === null)
  );
}

function isOrderStatusPayload(
  payload: unknown,
): payload is OrderConfirmedPayload | OrderCancelledPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "order" in payload &&
    typeof (payload as { order?: unknown }).order === "object" &&
    (payload as { order?: unknown }).order !== null &&
    "id" in (payload as { order: Record<string, unknown> }).order &&
    typeof (payload as { order: { id?: unknown } }).order.id === "string"
  );
}

function isReservationCreatedPayload(
  payload: unknown,
): payload is ReservationCreatedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "current" in payload &&
    typeof (payload as { current?: unknown }).current === "object" &&
    (payload as { current?: unknown }).current !== null &&
    "id" in (payload as { current: Record<string, unknown> }).current &&
    "orderId" in (payload as { current: Record<string, unknown> }).current &&
    typeof (payload as { current: { id?: unknown } }).current.id === "string" &&
    typeof (payload as { current: { orderId?: unknown } }).current.orderId ===
      "string"
  );
}

function isReservationStatusPayload(
  payload: unknown,
): payload is ReservationConfirmedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "reservation" in payload &&
    typeof (payload as { reservation?: unknown }).reservation === "object" &&
    (payload as { reservation?: unknown }).reservation !== null &&
    "id" in (payload as { reservation: Record<string, unknown> }).reservation &&
    "orderId" in
      (payload as { reservation: Record<string, unknown> }).reservation &&
    typeof (payload as { reservation: { id?: unknown } }).reservation.id ===
      "string" &&
    typeof (payload as { reservation: { orderId?: unknown } }).reservation
      .orderId === "string"
  );
}

function isPaymentStatusPayload(
  payload: unknown,
): payload is PaymentAuthorizedPayload | PaymentFailedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "payment" in payload &&
    typeof (payload as { payment?: unknown }).payment === "object" &&
    (payload as { payment?: unknown }).payment !== null &&
    "id" in (payload as { payment: Record<string, unknown> }).payment &&
    "orderId" in (payload as { payment: Record<string, unknown> }).payment &&
    typeof (payload as { payment: { id?: unknown } }).payment.id === "string" &&
    typeof (payload as { payment: { orderId?: unknown } }).payment.orderId ===
      "string"
  );
}

import {
  CAUSATION_ID_HEADER,
  CORRELATION_ID_HEADER,
  ORDER_SERVICE_API_PREFIX,
} from "../constants/index.js";
import type { Order, OrderId, OutboxEventMetadata } from "../entities/index.js";
import { orderAdapter } from "../infrastructure/adapters/order/order.adapter.js";

export async function findOne({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Order | null> {
  return orderAdapter.path(`${ORDER_SERVICE_API_PREFIX}/orders/{orderId}`).get({
    allowNotFound: true,
    params: { orderId },
  });
}

export async function confirmOne({
  orderId,
  outboxEventMetadata,
}: {
  orderId: OrderId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Order> {
  const order = await orderAdapter
    .path(`${ORDER_SERVICE_API_PREFIX}/orders/{orderId}/confirm`)
    .post<Order>({
      params: { orderId },
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!order) {
    throw new Error("Order confirmation response was empty.");
  }

  return order;
}

export async function cancelOne({
  orderId,
  outboxEventMetadata,
}: {
  orderId: OrderId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Order> {
  const order = await orderAdapter
    .path(`${ORDER_SERVICE_API_PREFIX}/orders/{orderId}/cancel`)
    .post<Order>({
      params: { orderId },
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!order) {
    throw new Error("Order cancellation response was empty.");
  }

  return order;
}

function buildOutboxEventHeaders({
  outboxEventMetadata,
}: {
  outboxEventMetadata?: OutboxEventMetadata;
}): Record<string, string> {
  return Object.fromEntries(
    [
      [CORRELATION_ID_HEADER, outboxEventMetadata?.correlationId ?? null],
      [CAUSATION_ID_HEADER, outboxEventMetadata?.causationId ?? null],
    ].filter((header): header is [string, string] => header[1] !== null),
  );
}

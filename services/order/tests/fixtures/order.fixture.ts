import { randomUUID } from "node:crypto";

import type { Order, OrderItem } from "../../src/entities/index.js";

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultOrder(): Order {
  return {
    id: randomUUID(),
    customerId: randomUUID(),
    status: "PENDING",
    totalAmount: 49.99,
    currency: "EUR",
    items: [],
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

function createDefaultOrderItem({ orderId }: { orderId: string }): OrderItem {
  return {
    id: randomUUID(),
    orderId,
    productId: randomUUID(),
    quantity: 1,
    unitPriceSnapshot: 49.99,
    lineTotalSnapshot: 49.99,
    skuSnapshot: "SKU-001",
    nameSnapshot: "Test product",
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

export function createOne({
  order,
  items,
}: {
  order?: Partial<Order>;
  items?: Partial<OrderItem>[];
} = {}): Order {
  const createdOrder = { ...createDefaultOrder(), ...order };

  return {
    ...createdOrder,
    items: (items ?? []).map((item) => ({
      ...createDefaultOrderItem({ orderId: createdOrder.id }),
      ...item,
      orderId: createdOrder.id,
    })),
  };
}

export function createMany({
  orders,
}: {
  orders: Array<
    Omit<Partial<Order>, "items"> & { items?: Partial<OrderItem>[] }
  >;
}): Order[] {
  return orders.map(({ items, ...order }) => createOne({ order, items }));
}

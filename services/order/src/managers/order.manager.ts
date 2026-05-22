import type {
  CreateOrderInput,
  FindManyOrdersQuery,
  NewOrderItem,
  Order,
  OrderCancelledPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  OrderId,
  OrderList,
  OutboxEventMetadata,
} from "../entities/index.js";
import {
  OrderEventType,
  OrderEventVersion,
} from "../entities/order-event.entity.js";
import {
  InvalidOrderStatusError,
  OrderCurrencyMismatchError,
  OrderNotFoundError,
} from "../errors/errors.js";
import { withTransaction } from "../infrastructure/adapters/database/index.js";
import * as inventoryManager from "./inventory.manager.js";
import type { CreateOutboxEventInput } from "./outbox-event.manager.js";
import * as outboxEventManager from "./outbox-event.manager.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as orderSagaRepository from "../repositories/order-saga.repository.js";

export async function findMany({
  query,
}: {
  query: FindManyOrdersQuery;
}): Promise<OrderList> {
  return orderRepository.findMany({
    query,
  });
}

export async function findOne({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Order> {
  const order = await orderRepository.findOne({
    orderId,
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  return order;
}

export async function createOne({
  createOrderInput,
  outboxEventMetadata,
}: {
  createOrderInput: CreateOrderInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Order> {
  const requestedItems = aggregateOrderItems({
    items: createOrderInput.items,
  });

  const products = await Promise.all(
    requestedItems.map(async (item) => ({
      item,
      product: await inventoryManager.findOneProductSnapshot({
        productId: item.productId,
      }),
    })),
  );

  const currency = products[0].product.currency;

  if (
    products.some(({ product }) => product.currency !== currency)
  ) {
    throw new OrderCurrencyMismatchError();
  }

  const date = new Date().toISOString();

  const newOrderItems = products.map<NewOrderItem>(({ item, product }) => {
    const unitPriceCents = toCents(product.price);
    const lineTotalCents = unitPriceCents * item.quantity;

    return {
      productId: product.id,
      quantity: item.quantity,
      unitPriceSnapshot: fromCents(unitPriceCents),
      lineTotalSnapshot: fromCents(lineTotalCents),
      skuSnapshot: product.sku,
      nameSnapshot: product.name,
      createdAt: date,
      updatedAt: date,
    };
  });

  const totalAmount = fromCents(
    newOrderItems.reduce(
      (totalCents, item) => totalCents + toCents(item.lineTotalSnapshot),
      0,
    ),
  );

  return withTransaction({
    operation: async () => {
      const order = await orderRepository.createOne({
        newOrder: {
          customerId: createOrderInput.customerId,
          status: "PENDING",
          totalAmount,
          currency,
          createdAt: date,
          updatedAt: date,
        },
        newOrderItems,
      });

      const orderCreatedOutboxEvent = buildOrderCreatedOutboxEvent({
        order,
        outboxEventMetadata,
      });

      await outboxEventManager.createOne(orderCreatedOutboxEvent);

      await orderSagaRepository.createOneOrFindExisting({
        newOrderSaga: {
          orderId: order.id,
          status: "STARTED",
          currentStep: "RESERVE_INVENTORY",
          reservationId: null,
          paymentId: null,
          paymentMethodToken: createOrderInput.paymentMethodToken ?? null,
          failureReason: null,
          createdAt: date,
          updatedAt: date,
        },
      });

      return order;
    },
  });
}

export async function confirmOne({
  orderId,
  outboxEventMetadata,
}: {
  orderId: OrderId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Order> {
  return updateOneStatus({
    orderId,
    outboxEventMetadata,
    status: "CONFIRMED",
  });
}

export async function cancelOne({
  orderId,
  outboxEventMetadata,
}: {
  orderId: OrderId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Order> {
  return updateOneStatus({
    orderId,
    outboxEventMetadata,
    status: "CANCELLED",
  });
}

async function updateOneStatus({
  orderId,
  outboxEventMetadata,
  status,
}: {
  orderId: OrderId;
  outboxEventMetadata?: OutboxEventMetadata;
  status: Extract<Order["status"], "CANCELLED" | "CONFIRMED">;
}): Promise<Order> {
  const order = await orderRepository.findOneForUpdate({
    orderId,
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  if (order.status === status) {
    return order;
  }

  if (order.status !== "PENDING") {
    throw new InvalidOrderStatusError();
  }

  const updatedOrder = await orderRepository.updateOneStatus({
    orderId,
    updateOrderStatus: {
      status,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!updatedOrder) {
    throw new OrderNotFoundError();
  }

  const orderStatusUpdatedOutboxEvent = buildOrderStatusUpdatedOutboxEvent({
    order: updatedOrder,
    outboxEventMetadata,
  });

  await outboxEventManager.createOne(orderStatusUpdatedOutboxEvent);

  return updatedOrder;
}

function buildOrderCreatedOutboxEvent({
  order,
  outboxEventMetadata,
}: {
  order: Order;
  outboxEventMetadata?: OutboxEventMetadata;
}): CreateOutboxEventInput<OrderCreatedPayload> {
  return {
    type: OrderEventType.Created,
    version: OrderEventVersion.Created,
    action: "create",
    aggregate: buildOrderAggregate({ order }),
    payload: {
      current: order,
    },
    ...(outboxEventMetadata ?? {}),
  };
}

function buildOrderStatusUpdatedOutboxEvent({
  order,
  outboxEventMetadata,
}: {
  order: Order;
  outboxEventMetadata?: OutboxEventMetadata;
}): CreateOutboxEventInput<OrderConfirmedPayload | OrderCancelledPayload> {
  if (order.status === "CONFIRMED") {
    return {
      type: OrderEventType.Confirmed,
      version: OrderEventVersion.Confirmed,
      action: "update",
      aggregate: buildOrderAggregate({ order }),
      payload: {
        order: {
          id: order.id,
          previous: {
            status: "PENDING",
          },
          current: {
            status: "CONFIRMED",
          },
        },
      },
      ...(outboxEventMetadata ?? {}),
    };
  }

  if (order.status === "CANCELLED") {
    return {
      type: OrderEventType.Cancelled,
      version: OrderEventVersion.Cancelled,
      action: "update",
      aggregate: buildOrderAggregate({ order }),
      payload: {
        order: {
          id: order.id,
          previous: {
            status: "PENDING",
          },
          current: {
            status: "CANCELLED",
          },
        },
      },
      ...(outboxEventMetadata ?? {}),
    };
  }

  throw new InvalidOrderStatusError();
}

function buildOrderAggregate({ order }: { order: Order }) {
  return {
    type: "order",
    id: order.id,
  };
}

function aggregateOrderItems({
  items,
}: {
  items: CreateOrderInput["items"];
}): CreateOrderInput["items"] {
  const quantitiesByProductId = items.reduce<Map<string, number>>(
    (accumulator, item) => {
      accumulator.set(
        item.productId,
        (accumulator.get(item.productId) ?? 0) + item.quantity,
      );

      return accumulator;
    },
    new Map(),
  );

  return Array.from(quantitiesByProductId.entries()).map(
    ([productId, quantity]) => ({
      productId,
      quantity,
    }),
  );
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

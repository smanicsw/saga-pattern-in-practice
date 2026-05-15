import type {
  CreateOrderInput,
  FindManyOrdersQuery,
  NewOrderItem,
  Order,
  OrderId,
  OrderList,
} from "../entities/index.js";
import {
  InvalidOrderStatusError,
  OrderCurrencyMismatchError,
  OrderNotFoundError,
} from "../errors/errors.js";
import { withTransaction } from "../infrastructure/adapters/database/index.js";
import * as inventoryManager from "./inventory.manager.js";
import * as orderRepository from "../repositories/order.repository.js";

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
}: {
  createOrderInput: CreateOrderInput;
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
    operation: async () =>
      orderRepository.createOne({
        newOrder: {
          customerId: createOrderInput.customerId,
          status: "PENDING",
          totalAmount,
          currency,
          createdAt: date,
          updatedAt: date,
        },
        newOrderItems,
      }),
  });
}

export async function confirmOne({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Order> {
  return updateOneStatus({
    orderId,
    status: "CONFIRMED",
  });
}

export async function cancelOne({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Order> {
  return updateOneStatus({
    orderId,
    status: "CANCELLED",
  });
}

async function updateOneStatus({
  orderId,
  status,
}: {
  orderId: OrderId;
  status: Extract<Order["status"], "CANCELLED" | "CONFIRMED">;
}): Promise<Order> {
  return withTransaction({
    operation: async () => {
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

      return updatedOrder;
    },
  });
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

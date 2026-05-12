import type {
  FindManyOrdersQuery,
  Order,
  OrderId,
  OrderList,
} from "../entities/index.js";
import { OrderNotFoundError } from "../errors/errors.js";
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

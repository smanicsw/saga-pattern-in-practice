import type { FindManyOrdersQuery, OrderList } from "../entities/index.js";
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

import type { Order } from "../entities/index.js";

export interface OrderRepository {
  findAll(): Promise<Order[]>;
}

export function createOrderRepository(): OrderRepository {
  const orders: Order[] = [];

  return {
    async findAll() {
      return orders;
    },
  };
}

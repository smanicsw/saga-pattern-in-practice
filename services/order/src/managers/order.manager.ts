import {
  createOrderRepository,
  type OrderRepository,
} from "../repositories/index.js";

export interface OrderOverview {
  message: string;
  next: string;
  totalOrders: number;
}

export interface OrderManager {
  getOverview(): Promise<OrderOverview>;
}

export function createOrderManager({
  orderRepository = createOrderRepository(),
}: {
  orderRepository?: OrderRepository;
} = {}): OrderManager {
  return {
    async getOverview() {
      const orders = await orderRepository.findAll();

      return {
        message: "Order service is running",
        next: "Create an order endpoint, then connect saga orchestration and outbox messaging.",
        totalOrders: orders.length,
      };
    },
  };
}

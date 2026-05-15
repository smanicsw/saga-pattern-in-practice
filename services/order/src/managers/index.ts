export * as inventoryManager from "./inventory.manager.js";
export * as orderManager from "./order.manager.js";

export function createOrderManager({}: Record<string, never>) {
  return {
    getOverview: async () => ({
      message: "Order service is running",
      next: "Implement order endpoints",
      totalOrders: 0,
    }),
  };
}

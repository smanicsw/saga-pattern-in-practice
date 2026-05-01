import { createInventoryRepository, type InventoryRepository } from "../repositories/index.js";

export interface InventoryOverview {
  message: string;
  next: string;
  totalItems: number;
}

export interface InventoryManager {
  getOverview(): Promise<InventoryOverview>;
}

export function createInventoryManager(
  {
    inventoryRepository = createInventoryRepository()
  }: {
    inventoryRepository?: InventoryRepository;
  } = {}
): InventoryManager {
  return {
    async getOverview() {
      const inventoryItems = await inventoryRepository.findAll();

      return {
        message: "Inventory service is running",
        next: "Reserve and release stock as part of the order saga.",
        totalItems: inventoryItems.length
      };
    }
  };
}

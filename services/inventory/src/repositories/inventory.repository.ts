import type { InventoryItem } from "../entities/index.js";

export interface InventoryRepository {
  findAll(): Promise<InventoryItem[]>;
}

export function createInventoryRepository(): InventoryRepository {
  const inventoryItems: InventoryItem[] = [];

  return {
    async findAll() {
      return inventoryItems;
    }
  };
}

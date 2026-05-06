import { randomUUID } from "node:crypto";

export type StockLevel = {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultStockLevel(): StockLevel {
  return {
    id: randomUUID(),
    productId: randomUUID(),
    availableQuantity: 0,
    reservedQuantity: 0,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

export function createOne({
  stockLevel,
}: {
  stockLevel?: Partial<StockLevel>;
} = {}): StockLevel {
  return { ...createDefaultStockLevel(), ...stockLevel };
}

export function createMany({
  stockLevels,
}: {
  stockLevels: Partial<StockLevel>[];
}): StockLevel[] {
  return stockLevels.map((stockLevel) => createOne({ stockLevel }));
}

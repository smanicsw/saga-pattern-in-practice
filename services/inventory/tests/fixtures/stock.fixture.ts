import { randomUUID } from "node:crypto";

import type { Stock } from "../../src/entities/stock.entity.js";

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultStock(): Stock {
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
  stock,
}: {
  stock?: Partial<Stock>;
} = {}): Stock {
  return { ...createDefaultStock(), ...stock };
}

export function createMany({
  stocks,
}: {
  stocks: Partial<Stock>[];
}): Stock[] {
  return stocks.map((stock) => createOne({ stock }));
}

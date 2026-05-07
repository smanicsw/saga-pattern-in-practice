import { randomUUID } from "node:crypto";

import type { Product } from "../../src/entities/product.entity.js";

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultProduct(): Product {
  const uuid = randomUUID();

  return {
    id: uuid,
    sku: `SKU-${uuid}`,
    name: "Keyboard",
    description: "Mechanical keyboard",
    price: 49.99,
    currency: "EUR",
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

export function createOne({
  product,
}: {
  product?: Partial<Product>;
} = {}): Product {
  return { ...createDefaultProduct(), ...product };
}

export function createMany({
  products,
}: {
  products: Partial<Product>[];
}): Product[] {
  return products.map((product) => createOne({ product }));
}

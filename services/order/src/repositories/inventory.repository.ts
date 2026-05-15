import { INVENTORY_SERVICE_API_PREFIX } from "../constants/index.js";
import type { Product } from "../entities/index.js";
import { inventoryAdapter } from "../infrastructure/adapters/inventory/inventory.adapter.js";

export async function findOneProduct({
  productId,
}: {
  productId: string;
}): Promise<Product | null> {
  const product = await inventoryAdapter
    .path(`${INVENTORY_SERVICE_API_PREFIX}/products/{productId}`)
    .get<Product>({
      params: { productId },
    });

  if (!product) {
    return null;
  }

  return transformProduct({
    product,
  });
}

function transformProduct({
  product,
}: {
  product: Product;
}): Product {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: product.price,
    currency: product.currency,
  };
}

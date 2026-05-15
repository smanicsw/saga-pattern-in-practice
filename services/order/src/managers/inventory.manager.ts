import type { Product } from "../entities/index.js";
import { ProductNotFoundError } from "../errors/errors.js";
import * as inventoryRepository from "../repositories/inventory.repository.js";

export async function findOneProductSnapshot({
  productId,
}: {
  productId: string;
}): Promise<Product> {
  const product = await inventoryRepository.findOneProduct({
    productId,
  });

  if (!product) {
    throw new ProductNotFoundError();
  }

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: product.price,
    currency: product.currency,
  };
}

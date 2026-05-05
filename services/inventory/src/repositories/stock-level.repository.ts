import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";

export async function createOne({
  productId,
  availableQuantity = 0,
  reservedQuantity = 0,
}: {
  productId: string;
  availableQuantity?: number;
  reservedQuantity?: number;
}): Promise<void> {
  const db = getQueryBuilder();

  await db("stock_levels").insert({
    product_id: productId,
    available_quantity: availableQuantity,
    reserved_quantity: reservedQuantity,
  });
}

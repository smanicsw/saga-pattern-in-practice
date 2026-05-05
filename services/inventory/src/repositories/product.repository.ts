import {
    NewProduct,
    NewProductRow,
    Product,
    ProductRow,
} from "../entities/product.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import { toStringValue } from "../utils/db-value.util.js";

export async function createOne({
  newProduct,
}: {
  newProduct: NewProduct;
}): Promise<Product> {
  const db = getQueryBuilder();
  
  const productRowToCreate = transformToRow({newProduct});

  const [createdProductRow] = await db<ProductRow>("products")
    .insert(productRowToCreate)
    .returning([
      "id",
      "sku",
      "name",
      "price",
      "currency",
      "created_at",
      "updated_at"
    ]);

  return transformFromRow({productRow: createdProductRow});
}

function transformToRow({newProduct}: {newProduct: NewProduct}): NewProductRow {
  return {
    sku: newProduct.sku,
    name: newProduct.name,
    price: String(newProduct.price),
    currency: newProduct.currency,
    created_at: newProduct.createdAt,
    updated_at: newProduct.updatedAt,
  };
}

function transformFromRow({productRow}: {productRow: ProductRow}): Product {
  return {
    id: productRow.id,
    sku: productRow.sku,
    name: productRow.name,
    price: Number(productRow.price),
    currency: productRow.currency,
    createdAt: toStringValue(productRow.created_at),
    updatedAt: toStringValue(productRow.updated_at),
  };
}

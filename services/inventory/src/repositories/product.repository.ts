import {
    NewProduct,
    NewProductRow,
    Product,
    ProductRow,
} from "../entities/product.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";

export async function createOne({
  newProduct,
}: {
  newProduct: NewProduct;
}): Promise<Product> {
  const db = getQueryBuilder();
  
  const productRowToCreate = transformToRow({newProduct});

  const [createdProductRow] = await db<ProductRow>("products")
    .insert(productRowToCreate)
    .returning("*");

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
    createdAt: productRow.created_at,
    updatedAt: productRow.updated_at,
  };
}

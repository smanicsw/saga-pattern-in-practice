import type { CursorPaginationQuery } from "../entities/pagination.entity.js";
import {
  NewProduct,
  NewProductRow,
  Product,
  ProductId,
  ProductList,
  ProductRow,
  UpdateProduct,
  UpdateProductRow,
} from "../entities/product.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function createOne({
  newProduct,
}: {
  newProduct: NewProduct;
}): Promise<Product> {
  const db = getQueryBuilder();

  const productRowToCreate = transformToRow({ newProduct });

  const [createdProductRow] = await db<ProductRow>("products")
    .insert(productRowToCreate)
    .returning([
      "id",
      "sku",
      "name",
      "description",
      "price",
      "currency",
      "created_at",
      "updated_at",
    ]);

  return transformFromRow({ productRow: createdProductRow });
}

export async function findMany({
  query,
}: {
  query: CursorPaginationQuery;
}): Promise<ProductList> {
  const db = getQueryBuilder();

  const productRows: ProductRow[] = await db<ProductRow>("products")
    .select([
      "id",
      "sku",
      "name",
      "description",
      "price",
      "currency",
      "created_at",
      "updated_at",
    ])
    .modify((queryBuilder) => {
      if (!query.cursor) {
        return;
      }

      queryBuilder.whereRaw(
        "(created_at, id) > (select created_at, id from products where id = ?)",
        [query.cursor],
      );
    })
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .limit(query.limit + 1);

  const pageRows = productRows.slice(0, query.limit);
  const nextCursor =
    productRows.length > query.limit ? pageRows[pageRows.length - 1].id : null;

  return {
    items: pageRows.map((productRow) => transformFromRow({ productRow })),
    pagination: {
      limit: query.limit,
      nextCursor,
    },
  };
}

export async function findOne({
  productId,
}: {
  productId: ProductId;
}): Promise<Product | null> {
  const db = getQueryBuilder();

  const productRow = await db<ProductRow>("products")
    .select([
      "id",
      "sku",
      "name",
      "description",
      "price",
      "currency",
      "created_at",
      "updated_at",
    ])
    .where("id", productId)
    .first();

  if (!productRow) {
    return null;
  }

  return transformFromRow({ productRow });
}

export async function updateOne({
  productId,
  updateProduct,
}: {
  productId: ProductId;
  updateProduct: UpdateProduct;
}): Promise<Product | null> {
  const db = getQueryBuilder();

  const productRowToUpdate = transformUpdateToRow({ updateProduct });

  const [updatedProductRow] = await db<ProductRow>("products")
    .where("id", productId)
    .update(productRowToUpdate)
    .returning([
      "id",
      "sku",
      "name",
      "description",
      "price",
      "currency",
      "created_at",
      "updated_at",
    ]);

  if (!updatedProductRow) {
    return null;
  }

  return transformFromRow({ productRow: updatedProductRow });
}

export async function deleteOne({
  productId,
}: {
  productId: ProductId;
}): Promise<number> {
  const db = getQueryBuilder();

  return db<ProductRow>("products")
    .where("id", productId)
    .delete();
}

function transformToRow({
  newProduct,
}: {
  newProduct: NewProduct;
}): NewProductRow {
  return {
    sku: newProduct.sku,
    name: newProduct.name,
    description: newProduct.description,
    price: String(newProduct.price),
    currency: newProduct.currency,
    created_at: newProduct.createdAt,
    updated_at: newProduct.updatedAt,
  };
}

function transformUpdateToRow({
  updateProduct,
}: {
  updateProduct: UpdateProduct;
}): UpdateProductRow {
  return {
    ...(updateProduct.name !== undefined ? { name: updateProduct.name } : {}),
    ...(updateProduct.description !== undefined
      ? { description: updateProduct.description }
      : {}),
    ...(updateProduct.price !== undefined
      ? { price: String(updateProduct.price) }
      : {}),
    updated_at: updateProduct.updatedAt,
  };
}

function transformFromRow({
  productRow,
}: {
  productRow: ProductRow;
}): Product {
  return {
    id: productRow.id,
    sku: productRow.sku,
    name: productRow.name,
    description: productRow.description,
    price: Number(productRow.price),
    currency: productRow.currency,
    createdAt: toStringValue(productRow.created_at),
    updatedAt: toStringValue(productRow.updated_at),
  };
}

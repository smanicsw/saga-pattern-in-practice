import type { CursorPaginationQuery } from "../entities/pagination.entity.js";
import {
  NewProduct,
  NewProductRow,
  Product,
  ProductId,
  ProductList,
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

  const productRowToCreate = transformToRow({ newProduct });

  const [createdProductRow] = await db<ProductRow>("products")
    .insert(productRowToCreate)
    .returning([
      "id",
      "sku",
      "name",
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

  const baseQuery = db<ProductRow>("products");

  if (query.cursor) {
    const cursorRow = await db<ProductRow>("products")
      .select(["id", "created_at"])
      .where("id", query.cursor)
      .first();

    if (!cursorRow) {
      return {
        items: [],
        pagination: {
          limit: query.limit,
          nextCursor: null,
        },
      };
    }

    baseQuery.whereRaw("(created_at, id) > (?, ?)", [
      cursorRow.created_at,
      cursorRow.id,
    ]);
  }

  const productRows = await baseQuery
    .clone()
    .select([
      "id",
      "sku",
      "name",
      "price",
      "currency",
      "created_at",
      "updated_at",
    ])
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

function transformToRow({
  newProduct,
}: {
  newProduct: NewProduct;
}): NewProductRow {
  return {
    sku: newProduct.sku,
    name: newProduct.name,
    price: String(newProduct.price),
    currency: newProduct.currency,
    created_at: newProduct.createdAt,
    updated_at: newProduct.updatedAt,
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
    price: Number(productRow.price),
    currency: productRow.currency,
    createdAt: toStringValue(productRow.created_at),
    updatedAt: toStringValue(productRow.updated_at),
  };
}

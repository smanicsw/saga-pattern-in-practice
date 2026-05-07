import type { ProductId } from "../entities/product.entity.js";
import {
  NewStock,
  NewStockRow,
  ReservedStockProduct,
  Stock,
  StockRow,
  UpdateStock,
  UpdateStockRow,
} from "../entities/stock.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function createOne({
  newStock,
}: {
  newStock: NewStock;
}): Promise<Stock> {
  const db = getQueryBuilder();

  const stockRowToCreate = transformToRow({ newStock });

  const [createdStockRow] = await db<StockRow>("stock")
    .insert(stockRowToCreate)
    .returning([
      "id",
      "product_id",
      "available_quantity",
      "reserved_quantity",
      "created_at",
      "updated_at",
    ]);

  return transformFromRow({ stockRow: createdStockRow });
}

export async function findOneByProductId({
  productId,
}: {
  productId: ProductId;
}): Promise<Stock | null> {
  const db = getQueryBuilder();

  const stockRow = await db<StockRow>("stock")
    .select([
      "id",
      "product_id",
      "available_quantity",
      "reserved_quantity",
      "created_at",
      "updated_at",
    ])
    .where("product_id", productId)
    .first();

  if (!stockRow) {
    return null;
  }

  return transformFromRow({ stockRow });
}

export async function updateOneByProductId({
  productId,
  updateStock,
}: {
  productId: ProductId;
  updateStock: UpdateStock;
}): Promise<Stock | null> {
  const db = getQueryBuilder();

  const stockRowToUpdate = transformUpdateToRow({ updateStock });

  const [updatedStockRow] = await db<StockRow>("stock")
    .where("product_id", productId)
    .update(stockRowToUpdate)
    .returning([
      "id",
      "product_id",
      "available_quantity",
      "reserved_quantity",
      "created_at",
      "updated_at",
    ]);

  if (!updatedStockRow) {
    return null;
  }

  return transformFromRow({ stockRow: updatedStockRow });
}

export async function findManyByProductIdsForUpdate({
  productIds,
}: {
  productIds: ProductId[];
}): Promise<Stock[]> {
  if (productIds.length === 0) {
    return [];
  }

  const db = getQueryBuilder();

  const stockRows = await db<StockRow>("stock")
    .select([
      "id",
      "product_id",
      "available_quantity",
      "reserved_quantity",
      "created_at",
      "updated_at",
    ])
    .whereIn("product_id", productIds)
    .forUpdate();

  return stockRows.map((stockRow) => transformFromRow({ stockRow }));
}

export async function updateManyForReservation({
  products,
  updatedAt,
}: {
  products: ReservedStockProduct[];
  updatedAt: string;
}): Promise<void> {
  if (products.length === 0) {
    return;
  }

  const db = getQueryBuilder();


  //NOTE: One DB call per product works fine for small to medium orders. For large orders, this could be improved
  for (const product of products) {
    await db<StockRow>("stock")
      .where("product_id", product.productId)
      .update({
        available_quantity: product.availableQuantity,
        reserved_quantity: product.reservedQuantity,
        updated_at: updatedAt,
      });
  }
}

function transformToRow({
  newStock,
}: {
  newStock: NewStock;
}): NewStockRow {
  return {
    product_id: newStock.productId,
    available_quantity: newStock.availableQuantity,
    reserved_quantity: newStock.reservedQuantity,
    created_at: newStock.createdAt,
    updated_at: newStock.updatedAt,
  };
}

function transformUpdateToRow({
  updateStock,
}: {
  updateStock: UpdateStock;
}): UpdateStockRow {
  return {
    available_quantity: updateStock.availableQuantity,
    updated_at: updateStock.updatedAt,
  };
}

function transformFromRow({
  stockRow,
}: {
  stockRow: StockRow;
}): Stock {
  return {
    id: stockRow.id,
    productId: stockRow.product_id,
    availableQuantity: stockRow.available_quantity,
    reservedQuantity: stockRow.reserved_quantity,
    createdAt: toStringValue(stockRow.created_at),
    updatedAt: toStringValue(stockRow.updated_at),
  };
}

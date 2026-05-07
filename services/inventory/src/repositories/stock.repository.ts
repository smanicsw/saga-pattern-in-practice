import {
  NewStock,
  NewStockRow,
  Stock,
  StockRow,
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

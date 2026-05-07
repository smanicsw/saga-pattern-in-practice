import type { CreateStockInput, Stock } from "../entities/stock.entity.js";
import * as stockRepository from "../repositories/stock.repository.js";

export async function createOne({
  createStockInput,
}: {
  createStockInput: CreateStockInput;
}): Promise<Stock> {
  const date = new Date().toISOString();

  const newStock = {
    ...createStockInput,
    availableQuantity: createStockInput.availableQuantity ?? 0,
    reservedQuantity: createStockInput.reservedQuantity ?? 0,
    createdAt: date,
    updatedAt: date,
  };

  return stockRepository.createOne({
    newStock,
  });
}

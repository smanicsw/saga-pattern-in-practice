import type { ProductId } from "./product.entity.js";

export type StockId = string;

export type Stock = {
  id: StockId;
  productId: ProductId;
  availableQuantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type StockRow = {
  id: StockId;
  product_id: ProductId;
  available_quantity: number;
  reserved_quantity: number;
  created_at: string;
  updated_at: string;
};

export type CreateStockInput = {
  productId: ProductId;
  availableQuantity?: number;
  reservedQuantity?: number;
};

export type NewStock = Omit<Stock, "id">;

export type NewStockRow = Omit<StockRow, "id">;

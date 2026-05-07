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

export type UpdateStockInput = {
  availableQuantity: number;
};

export type ReserveStockInput = {
  products: Array<{
    productId: ProductId;
    quantity: number;
  }>;
};

export type ReservedStockProduct = Pick<
  Stock,
  "productId" | "availableQuantity" | "reservedQuantity"
>;

export type UpdateStock = UpdateStockInput & {
  updatedAt: string;
};

export type NewStock = Omit<Stock, "id">;

export type NewStockRow = Omit<StockRow, "id">;

export type UpdateStockRow = Pick<StockRow, "available_quantity" | "updated_at">;

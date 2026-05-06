
import type { CursorPagination } from "./pagination.entity.js";

export type ProductId = string;

export type Product = {
  id: ProductId;
  sku: string;
  name: string;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductRow = {
  id: ProductId;
  sku: string;
  name: string;
  price: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  price: number;
};

export type ProductList = {
  items: Product[];
  pagination: CursorPagination;
};

export type NewProduct = Omit<Product, "id">;

export type NewProductRow = Omit<ProductRow, "id">;

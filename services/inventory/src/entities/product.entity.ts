
import type { CursorPagination } from "./pagination.entity.js";

export type ProductId = string;

export type Product = {
  id: ProductId;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductRow = {
  id: ProductId;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  description?: string;
  price: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
};

export type UpdateProduct = UpdateProductInput & {
  updatedAt: string;
};

export type ProductList = {
  items: Product[];
  pagination: CursorPagination;
};

export type NewProduct = Omit<Product, "id">;

export type NewProductRow = Omit<ProductRow, "id">;

export type UpdateProductRow = Partial<
  Pick<ProductRow, "name" | "description" | "price" | "updated_at">
>;

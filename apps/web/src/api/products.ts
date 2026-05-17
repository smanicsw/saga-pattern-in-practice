import { request } from "./client";
import type {
  CreateProductInput,
  Product,
  ProductList,
  Stock,
  UpdateProductInput,
} from "./types";

export function listProducts(params: { cursor?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();

  return request<ProductList>(
    `/api/inventory/products${query ? `?${query}` : ""}`,
  );
}

export function createProduct(input: CreateProductInput) {
  return request<Product>("/api/inventory/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(productId: string, input: UpdateProductInput) {
  return request<Product>(`/api/inventory/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(productId: string) {
  return request<void>(`/api/inventory/products/${productId}`, {
    method: "DELETE",
  });
}

export function getStock(productId: string) {
  return request<Stock>(`/api/inventory/stock/${productId}`);
}

export function updateStock(productId: string, availableQuantity: number) {
  return request<Stock>(`/api/inventory/stock/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ availableQuantity }),
  });
}

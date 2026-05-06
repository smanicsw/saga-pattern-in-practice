import { NotFoundError } from "@saga/http-kit";
import type { CursorPaginationQuery } from "../entities/pagination.entity.js";
import {
  CreateProductInput,
  Product,
  ProductId,
  ProductList,
} from "../entities/product.entity.js";
import * as productRepository from "../repositories/product.repository.js";
import * as stockLevelRepository from "../repositories/stock-level.repository.js";

export async function createOne({
  createProductInput,
}: {
  createProductInput: CreateProductInput;
}): Promise<Product> {
  const date = new Date().toISOString();

  const newProduct = {
    ...createProductInput,
    currency: "EUR",
    createdAt: date,
    updatedAt: date,
  };

  const product = await productRepository.createOne({ newProduct });

  await stockLevelRepository.createOne({
    productId: product.id,
  });

  return product;
}

export async function findMany({
  query,
}: {
  query: CursorPaginationQuery;
}): Promise<ProductList> {
  return productRepository.findMany({
    query,
  });
}

export async function findOne({
  productId,
}: {
  productId: ProductId;
}): Promise<Product> {
  const product = await productRepository.findOne({
    productId,
  });

  if (!product) {
    throw new NotFoundError({
      message: "Product not found.",
    });
  }

  return product;
}

export async function deleteOne({
  productId,
}: {
  productId: ProductId;
}): Promise<void> {
  await productRepository.deleteOne({
    productId,
  });
}

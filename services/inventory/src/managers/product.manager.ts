import type { CursorPaginationQuery } from "../entities/pagination.entity.js";
import {
  CreateProductInput,
  Product,
  ProductId,
  ProductList,
  UpdateProductInput,
} from "../entities/product.entity.js";
import { ProductNotFoundError } from "../errors/errors.js";
import * as productRepository from "../repositories/product.repository.js";
import * as stockManager from "./stock.manager.js";

export async function createOne({
  createProductInput,
}: {
  createProductInput: CreateProductInput;
}): Promise<Product> {
  const date = new Date().toISOString();

  const newProduct = {
    ...createProductInput,
    description: createProductInput.description ?? null,
    currency: "EUR",
    createdAt: date,
    updatedAt: date,
  };

  const product = await productRepository.createOne({ newProduct });

  await stockManager.createOne({
    createStockInput: {
      productId: product.id,
    },
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
    throw new ProductNotFoundError();
  }

  return product;
}

export async function updateOne({
  productId,
  updateProductInput,
}: {
  productId: ProductId;
  updateProductInput: UpdateProductInput;
}): Promise<Product> {
  const product = await productRepository.updateOne({
    productId,
    updateProduct: {
      ...updateProductInput,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!product) {
    throw new ProductNotFoundError();
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

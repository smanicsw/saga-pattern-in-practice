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
  const existingProduct = await productRepository.findOneBySku({
    sku: createProductInput.sku,
  });

  if (existingProduct) {
    return existingProduct;
  }

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
  const currentProduct = await productRepository.findOne({
    productId,
  });

  if (!currentProduct) {
    throw new ProductNotFoundError();
  }

  if (isProductUpdateNoop({ currentProduct, updateProductInput })) {
    return currentProduct;
  }

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

function isProductUpdateNoop({
  currentProduct,
  updateProductInput,
}: {
  currentProduct: Product;
  updateProductInput: UpdateProductInput;
}): boolean {
  return (
    (updateProductInput.name === undefined ||
      updateProductInput.name === currentProduct.name) &&
    (updateProductInput.description === undefined ||
      updateProductInput.description === currentProduct.description) &&
    (updateProductInput.price === undefined ||
      updateProductInput.price === currentProduct.price)
  );
}

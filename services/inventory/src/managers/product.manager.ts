import { CreateProductInput, Product } from "../entities/product.entity.js";
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

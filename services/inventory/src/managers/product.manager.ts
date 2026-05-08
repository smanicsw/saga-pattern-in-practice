import type { CursorPaginationQuery } from "../entities/pagination.entity.js";
import {
  InventoryEventType,
  InventoryEventVersion,
  ProductCreatedPayload,
  ProductDeletedPayload,
  ProductUpdatedPayload,
} from "../entities/inventory-event.entity.js";
import {
  CreateProductInput,
  Product,
  ProductId,
  ProductList,
  UpdateProductInput,
} from "../entities/product.entity.js";
import type { OutboxEventMetadata } from "../entities/outbox-event.entity.js";
import { ProductNotFoundError } from "../errors/errors.js";
import * as productRepository from "../repositories/product.repository.js";
import * as outboxEventManager from "./outbox-event.manager.js";
import * as stockManager from "./stock.manager.js";

export async function createOne({
  createProductInput,
  outboxEventMetadata,
}: {
  createProductInput: CreateProductInput;
  outboxEventMetadata?: OutboxEventMetadata;
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

  const createProductOutboxEvent = {
    type: InventoryEventType.ProductCreated,
    version: InventoryEventVersion.ProductCreated,
    action: "create",
    aggregate: {
      type: "product",
      id: product.id,
    },
    payload: {
      current: product,
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ProductCreatedPayload>(
    createProductOutboxEvent,
  );

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
  outboxEventMetadata,
}: {
  productId: ProductId;
  updateProductInput: UpdateProductInput;
  outboxEventMetadata?: OutboxEventMetadata;
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

  const updateProductOutboxEvent = {
    type: InventoryEventType.ProductUpdated,
    version: InventoryEventVersion.ProductUpdated,
    action: "update",
    aggregate: {
      type: "product",
      id: product.id,
    },
    payload: buildProductUpdatedPayload({
      currentProduct,
      updatedProduct: product,
      updateProductInput,
    }),
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ProductUpdatedPayload>(
    updateProductOutboxEvent,
  );

  return product;
}

export async function deleteOne({
  productId,
  outboxEventMetadata,
}: {
  productId: ProductId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<void> {
  const currentProduct = await productRepository.findOne({
    productId,
  });

  if (!currentProduct) {
    return;
  }

  const deletedProductsCount = await productRepository.deleteOne({
    productId,
  });

  if (deletedProductsCount === 0) {
    return;
  }

  const deleteProductOutboxEvent = {
    type: InventoryEventType.ProductDeleted,
    version: InventoryEventVersion.ProductDeleted,
    action: "delete",
    aggregate: {
      type: "product",
      id: currentProduct.id,
    },
    payload: {
      previous: currentProduct,
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ProductDeletedPayload>(
    deleteProductOutboxEvent,
  );
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

function buildProductUpdatedPayload({
  currentProduct,
  updatedProduct,
  updateProductInput,
}: {
  currentProduct: Product;
  updatedProduct: Product;
  updateProductInput: UpdateProductInput;
}): ProductUpdatedPayload {
  return {
    productId: currentProduct.id,
    previous: {
      ...(updateProductInput.name !== undefined
        ? { name: currentProduct.name }
        : {}),
      ...(updateProductInput.description !== undefined
        ? { description: currentProduct.description }
        : {}),
      ...(updateProductInput.price !== undefined
        ? { price: currentProduct.price }
        : {}),
    },
    current: {
      ...(updateProductInput.name !== undefined
        ? { name: updatedProduct.name }
        : {}),
      ...(updateProductInput.description !== undefined
        ? { description: updatedProduct.description }
        : {}),
      ...(updateProductInput.price !== undefined
        ? { price: updatedProduct.price }
        : {}),
    },
  };
}

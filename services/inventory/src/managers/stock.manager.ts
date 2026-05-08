import type { ProductId } from "../entities/product.entity.js";
import type { OutboxEventMetadata } from "../entities/outbox-event.entity.js";
import {
  InventoryEventType,
  InventoryEventVersion,
  StockQuantityChange,
  StockUpdatedPayload,
} from "../entities/inventory-event.entity.js";
import type {
  ConfirmReservationStockInput,
  CreateStockInput,
  ReleaseReservationStockInput,
  ReserveStockInput,
  Stock,
  UpdateStockInput,
} from "../entities/stock.entity.js";
import {
  InsufficientReservedStockError,
  InsufficientStockError,
  StockNotFoundError,
} from "../errors/errors.js";
import * as stockRepository from "../repositories/stock.repository.js";
import * as outboxEventManager from "./outbox-event.manager.js";

export async function createOne({
  createStockInput,
}: {
  createStockInput: CreateStockInput;
}): Promise<Stock> {
  const date = new Date().toISOString();

  const newStock = {
    ...createStockInput,
    availableQuantity: createStockInput.availableQuantity ?? 0,
    reservedQuantity: createStockInput.reservedQuantity ?? 0,
    createdAt: date,
    updatedAt: date,
  };

  return stockRepository.createOne({
    newStock,
  });
}

export async function findOneByProductId({
  productId,
}: {
  productId: ProductId;
}): Promise<Stock> {
  const stock = await stockRepository.findOneByProductId({
    productId,
  });

  if (!stock) {
    throw new StockNotFoundError();
  }

  return stock;
}

export async function updateOneByProductId({
  productId,
  updateStockInput,
  outboxEventMetadata,
}: {
  productId: ProductId;
  updateStockInput: UpdateStockInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Stock> {
  const currentStock = await stockRepository.findOneByProductId({
    productId,
  });

  if (!currentStock) {
    throw new StockNotFoundError();
  }

  if (updateStockInput.availableQuantity === currentStock.availableQuantity) {
    return currentStock;
  }

  const stock = await stockRepository.updateOneByProductId({
    productId,
    updateStock: {
      ...updateStockInput,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!stock) {
    throw new StockNotFoundError();
  }

  const updateStockOutboxEvent = {
    type: InventoryEventType.StockUpdated,
    version: InventoryEventVersion.StockUpdated,
    action: "update",
    aggregate: {
      type: "stock",
      id: stock.id,
    },
    payload: {
      stockId: stock.id,
      productId: stock.productId,
      previous: {
        availableQuantity: currentStock.availableQuantity,
      },
      current: {
        availableQuantity: stock.availableQuantity,
      },
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<StockUpdatedPayload>(
    updateStockOutboxEvent,
  );

  return stock;
}

export async function reserveMany({
  reserveStockInput,
}: {
  reserveStockInput: ReserveStockInput;
}): Promise<void> {
  const productIds = reserveStockInput.products.map((product) => product.productId);

  const stocks = await stockRepository.findManyByProductIdsForUpdate({
    productIds,
  });

  const stockByProductId = new Map(
    stocks.map((stock) => [stock.productId, stock]),
  );

  const stockUpdates = reserveStockInput.products.map((product) => {
    const stock = stockByProductId.get(product.productId);

    if (!stock) {
      throw new StockNotFoundError();
    }

    if (stock.availableQuantity < product.quantity) {
      throw new InsufficientStockError();
    }

    return {
      productId: product.productId,
      availableQuantity: stock.availableQuantity - product.quantity,
      reservedQuantity: stock.reservedQuantity + product.quantity,
    };
  });

  await stockRepository.updateManyForReservation({
    products: stockUpdates,
    updatedAt: new Date().toISOString(),
  });
}

export async function confirmReservation({
  confirmReservationStockInput,
}: {
  confirmReservationStockInput: ConfirmReservationStockInput;
}): Promise<StockQuantityChange[]> {
  const productIds = confirmReservationStockInput.products.map(
    (product) => product.productId,
  );

  const stocks = await stockRepository.findManyByProductIdsForUpdate({
    productIds,
  });

  const stockByProductId = new Map(
    stocks.map((stock) => [stock.productId, stock]),
  );

  const stockUpdates = confirmReservationStockInput.products.map((product) => {
    const stock = stockByProductId.get(product.productId);

    if (!stock) {
      throw new StockNotFoundError();
    }

    if (stock.reservedQuantity < product.quantity) {
      throw new InsufficientReservedStockError();
    }

    return {
      stockChange: {
        productId: product.productId,
        previous: {
          availableQuantity: stock.availableQuantity,
          reservedQuantity: stock.reservedQuantity,
        },
        current: {
          availableQuantity: stock.availableQuantity,
          reservedQuantity: stock.reservedQuantity - product.quantity,
        },
      },
      stockUpdate: {
        productId: product.productId,
        availableQuantity: stock.availableQuantity,
        reservedQuantity: stock.reservedQuantity - product.quantity,
      },
    };
  });

  await stockRepository.updateManyForReservation({
    products: stockUpdates.map((stockUpdate) => stockUpdate.stockUpdate),
    updatedAt: new Date().toISOString(),
  });

  return stockUpdates.map((stockUpdate) => stockUpdate.stockChange);
}

export async function releaseReservation({
  releaseReservationStockInput,
}: {
  releaseReservationStockInput: ReleaseReservationStockInput;
}): Promise<StockQuantityChange[]> {
  const productIds = releaseReservationStockInput.products.map(
    (product) => product.productId,
  );

  const stocks = await stockRepository.findManyByProductIdsForUpdate({
    productIds,
  });

  const stockByProductId = new Map(
    stocks.map((stock) => [stock.productId, stock]),
  );

  const stockUpdates = releaseReservationStockInput.products.map((product) => {
    const stock = stockByProductId.get(product.productId);

    if (!stock) {
      throw new StockNotFoundError();
    }

    if (stock.reservedQuantity < product.quantity) {
      throw new InsufficientReservedStockError();
    }

    return {
      stockChange: {
        productId: product.productId,
        previous: {
          availableQuantity: stock.availableQuantity,
          reservedQuantity: stock.reservedQuantity,
        },
        current: {
          availableQuantity: stock.availableQuantity + product.quantity,
          reservedQuantity: stock.reservedQuantity - product.quantity,
        },
      },
      stockUpdate: {
        productId: product.productId,
        availableQuantity: stock.availableQuantity + product.quantity,
        reservedQuantity: stock.reservedQuantity - product.quantity,
      },
    };
  });

  await stockRepository.updateManyForReservation({
    products: stockUpdates.map((stockUpdate) => stockUpdate.stockUpdate),
    updatedAt: new Date().toISOString(),
  });

  return stockUpdates.map((stockUpdate) => stockUpdate.stockChange);
}

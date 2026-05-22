import {
  CAUSATION_ID_HEADER,
  CORRELATION_ID_HEADER,
  INVENTORY_SERVICE_API_PREFIX,
} from "../constants/index.js";
import type {
  CreateReservationInput,
  OutboxEventMetadata,
  Product,
  Reservation,
} from "../entities/index.js";
import { inventoryAdapter } from "../infrastructure/adapters/inventory/inventory.adapter.js";

export async function findOneProduct({
  productId,
}: {
  productId: string;
}): Promise<Product | null> {
  const product = await inventoryAdapter
    .path(`${INVENTORY_SERVICE_API_PREFIX}/products/{productId}`)
    .get<Product>({
      allowNotFound: true,
      params: { productId },
    });

  if (!product) {
    return null;
  }

  return transformProduct({
    product,
  });
}

export async function createReservation({
  createReservationInput,
  outboxEventMetadata,
}: {
  createReservationInput: CreateReservationInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Reservation> {
  const reservation = await inventoryAdapter
    .path(`${INVENTORY_SERVICE_API_PREFIX}/reservations`)
    .post<Reservation>({
      body: createReservationInput,
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!reservation) {
    throw new Error("Inventory reservation response was empty.");
  }

  return reservation;
}

export async function confirmReservation({
  outboxEventMetadata,
  reservationId,
}: {
  outboxEventMetadata?: OutboxEventMetadata;
  reservationId: string;
}): Promise<Reservation> {
  const reservation = await inventoryAdapter
    .path(`${INVENTORY_SERVICE_API_PREFIX}/reservations/{reservationId}/confirm`)
    .post<Reservation>({
      params: { reservationId },
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!reservation) {
    throw new Error("Inventory reservation confirmation response was empty.");
  }

  return reservation;
}

export async function releaseReservation({
  outboxEventMetadata,
  reservationId,
}: {
  outboxEventMetadata?: OutboxEventMetadata;
  reservationId: string;
}): Promise<Reservation> {
  const reservation = await inventoryAdapter
    .path(`${INVENTORY_SERVICE_API_PREFIX}/reservations/{reservationId}/release`)
    .post<Reservation>({
      params: { reservationId },
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!reservation) {
    throw new Error("Inventory reservation release response was empty.");
  }

  return reservation;
}

function transformProduct({
  product,
}: {
  product: Product;
}): Product {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: product.price,
    currency: product.currency,
  };
}

function buildOutboxEventHeaders({
  outboxEventMetadata,
}: {
  outboxEventMetadata?: OutboxEventMetadata;
}): Record<string, string> {
  return Object.fromEntries(
    [
      [CORRELATION_ID_HEADER, outboxEventMetadata?.correlationId ?? null],
      [CAUSATION_ID_HEADER, outboxEventMetadata?.causationId ?? null],
    ].filter((header): header is [string, string] => header[1] !== null),
  );
}

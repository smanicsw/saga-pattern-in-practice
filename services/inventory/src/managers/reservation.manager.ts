import { OrderId } from "../entities/order.entity.js";
import {
  InventoryEventType,
  InventoryEventVersion,
  ReservationConfirmedPayload,
  ReservationCreatedPayload,
  ReservationReleasedPayload,
} from "../entities/inventory-event.entity.js";
import {
  CreateReservationInput,
  Reservation,
  ReservationId,
} from "../entities/reservation.entity.js";
import type { OutboxEventMetadata } from "../entities/outbox-event.entity.js";
import {
  InvalidReservationStatusError,
  ReservationNotFoundError,
} from "../errors/errors.js";
import * as reservationProductRepository from "../repositories/reservation-product.repository.js";
import * as reservationRepository from "../repositories/reservation.repository.js";
import * as outboxEventManager from "./outbox-event.manager.js";
import * as stockManager from "./stock.manager.js";

export async function createOne({
  createReservationInput,
  outboxEventMetadata,
}: {
  createReservationInput: CreateReservationInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Reservation> {
  const existingReservation = await reservationRepository.findOneByOrderId({
    orderId: createReservationInput.orderId,
  });

  if (existingReservation) {
    return buildReservationWithProducts({
      reservation: existingReservation,
    });
  }

  const date = new Date().toISOString();

  const reservationProductsInput = aggregateReservationProducts({
    products: createReservationInput.products,
  });

  await stockManager.reserveMany({
    reserveStockInput: {
      products: reservationProductsInput,
    },
  });

  const reservation = await reservationRepository.createOne({
    newReservation: {
      orderId: createReservationInput.orderId,
      status: "PENDING",
      createdAt: date,
      updatedAt: date,
    },
  });

  const reservationProducts = await reservationProductRepository.createMany({
    newReservationProducts: reservationProductsInput.map((product) => ({
      reservationId: reservation.id,
      productId: product.productId,
      quantity: product.quantity,
      createdAt: date,
      updatedAt: date,
    })),
  });

  const createdReservation = {
    ...reservation,
    products: reservationProducts,
  };

  const createReservationOutboxEvent = {
    type: InventoryEventType.ReservationCreated,
    version: InventoryEventVersion.ReservationCreated,
    action: "create",
    aggregate: {
      type: "reservation",
      id: reservation.id,
    },
    payload: {
      current: createdReservation,
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ReservationCreatedPayload>(
    createReservationOutboxEvent,
  );

  return createdReservation;
}

export async function findOne({
  reservationId,
}: {
  reservationId: ReservationId;
}): Promise<Reservation> {
  const reservation = await reservationRepository.findOne({
    reservationId,
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  return buildReservationWithProducts({
    reservation,
  });
}

export async function findOneByOrderId({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Reservation> {
  const reservation = await reservationRepository.findOneByOrderId({
    orderId,
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  return buildReservationWithProducts({
    reservation,
  });
}

export async function confirmOne({
  reservationId,
  outboxEventMetadata,
}: {
  reservationId: ReservationId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Reservation> {
  const reservation = await reservationRepository.findOneForUpdate({
    reservationId,
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  if (reservation.status === "CONFIRMED") {
    return buildReservationWithProducts({
      reservation,
    });
  }

  if (reservation.status !== "PENDING") {
    throw new InvalidReservationStatusError();
  }

  const products = await reservationProductRepository.findManyByReservationId({
    reservationId,
  });

  const stockChanges = await stockManager.confirmReservation({
    confirmReservationStockInput: {
      products,
    },
  });

  const updatedReservation = await reservationRepository.updateOneStatus({
    reservationId,
    updateReservationStatus: {
      status: "CONFIRMED",
      updatedAt: new Date().toISOString(),
    },
  });

  if (!updatedReservation) {
    throw new ReservationNotFoundError();
  }

  const confirmedReservation = {
    ...updatedReservation,
    products,
  };

  const confirmReservationOutboxEvent = {
    type: InventoryEventType.ReservationConfirmed,
    version: InventoryEventVersion.ReservationConfirmed,
    action: "update",
    aggregate: {
      type: "reservation",
      id: reservation.id,
    },
    payload: {
      reservation: {
        id: reservation.id,
        orderId: reservation.orderId,
        previous: {
          status: "PENDING",
        },
        current: {
          status: "CONFIRMED",
        },
      },
      products: products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
      stockChanges,
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ReservationConfirmedPayload>(
    confirmReservationOutboxEvent,
  );

  return confirmedReservation;
}

export async function releaseOne({
  reservationId,
  outboxEventMetadata,
}: {
  reservationId: ReservationId;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Reservation> {
  const reservation = await reservationRepository.findOneForUpdate({
    reservationId,
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  if (reservation.status === "RELEASED") {
    return buildReservationWithProducts({
      reservation,
    });
  }

  if (reservation.status !== "PENDING") {
    throw new InvalidReservationStatusError();
  }

  const products = await reservationProductRepository.findManyByReservationId({
    reservationId,
  });

  const stockChanges = await stockManager.releaseReservation({
    releaseReservationStockInput: {
      products,
    },
  });

  const updatedReservation = await reservationRepository.updateOneStatus({
    reservationId,
    updateReservationStatus: {
      status: "RELEASED",
      updatedAt: new Date().toISOString(),
    },
  });

  if (!updatedReservation) {
    throw new ReservationNotFoundError();
  }

  const releasedReservation = {
    ...updatedReservation,
    products,
  };

  const releaseReservationOutboxEvent = {
    type: InventoryEventType.ReservationReleased,
    version: InventoryEventVersion.ReservationReleased,
    action: "update",
    aggregate: {
      type: "reservation",
      id: reservation.id,
    },
    payload: {
      reservation: {
        id: reservation.id,
        orderId: reservation.orderId,
        previous: {
          status: "PENDING",
        },
        current: {
          status: "RELEASED",
        },
      },
      products: products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
      stockChanges,
    },
    ...(outboxEventMetadata ?? {}),
  } as const;

  await outboxEventManager.createOne<ReservationReleasedPayload>(
    releaseReservationOutboxEvent,
  );

  return releasedReservation;
}

async function buildReservationWithProducts({
  reservation,
}: {
  reservation: Omit<Reservation, "products">;
}): Promise<Reservation> {
  const products = await reservationProductRepository.findManyByReservationId({
    reservationId: reservation.id,
  });

  return {
    ...reservation,
    products,
  };
}

function aggregateReservationProducts({
  products,
}: {
  products: CreateReservationInput["products"];
}): CreateReservationInput["products"] {
  const quantityByProductId = new Map<string, number>();

  for (const product of products) {
    quantityByProductId.set(
      product.productId,
      (quantityByProductId.get(product.productId) ?? 0) + product.quantity,
    );
  }

  return Array.from(quantityByProductId.entries()).map(
    ([productId, quantity]) => ({
      productId,
      quantity,
    }),
  );
}

import {
  CreateReservationInput,
  Reservation,
  ReservationId,
} from "../entities/reservation.entity.js";
import { ReservationNotFoundError } from "../errors/errors.js";
import * as reservationProductRepository from "../repositories/reservation-product.repository.js";
import * as reservationRepository from "../repositories/reservation.repository.js";
import * as stockManager from "./stock.manager.js";

export async function createOne({
  createReservationInput,
}: {
  createReservationInput: CreateReservationInput;
}): Promise<Reservation> {
  const existingReservation = await reservationRepository.findOneByOrderId({
    orderId: createReservationInput.orderId,
  });

  if (existingReservation) {
    const existingProducts = await reservationProductRepository.findManyByReservationId({
      reservationId: existingReservation.id,
    });

    return {
      ...existingReservation,
      products: existingProducts,
    };
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

  return {
    ...reservation,
    products: reservationProducts,
  };
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

  const products = await reservationProductRepository.findManyByReservationId({
    reservationId,
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

import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import * as reservationManager from "../../../managers/reservation.manager.js";
import * as reservationSchema from "../../schemas/reservations.schema.js";

export function registerReservationRoutes({
  router,
}: {
  router: Router;
}) {
  router.get(
    "/reservations/by-order/:orderId",
    defineRoute({
      schemas: {
        params: reservationSchema.FindOneReservationByOrderParams,
        response: reservationSchema.FindOneReservationResponse,
      },
      handler: async function ({ request }) {
        const { orderId } = request.params;

        return reservationManager.findOneByOrderId({
          orderId,
        });
      },
    }),
  );

  router.get(
    "/reservations/:reservationId",
    defineRoute({
      schemas: {
        params: reservationSchema.FindOneReservationParams,
        response: reservationSchema.FindOneReservationResponse,
      },
      handler: async function ({ request }) {
        const { reservationId } = request.params;

        return reservationManager.findOne({
          reservationId,
        });
      },
    }),
  );

  router.post(
    "/reservations",
    defineRoute({
      schemas: {
        body: reservationSchema.CreateOneReservationBody,
        response: reservationSchema.CreateOneReservationResponse,
      },
      status: 201,
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        return reservationManager.createOne({
          createReservationInput: request.body,
        });
      },
    }),
  );
}

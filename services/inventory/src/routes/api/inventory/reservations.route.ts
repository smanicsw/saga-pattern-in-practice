import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import * as reservationManager from "../../../managers/reservation.manager.js";
import getOutboxEventMetadata from "../../../tools/get-outbox-event-metadata.js";
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
    "/reservations/:reservationId/confirm",
    defineRoute({
      schemas: {
        params: reservationSchema.ConfirmOneReservationParams,
        response: reservationSchema.ConfirmOneReservationResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { reservationId } = request.params;

        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return reservationManager.confirmOne({
          reservationId,
          outboxEventMetadata,
        });
      },
    }),
  );

  router.post(
    "/reservations/:reservationId/release",
    defineRoute({
      schemas: {
        params: reservationSchema.ReleaseOneReservationParams,
        response: reservationSchema.ReleaseOneReservationResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { reservationId } = request.params;
        
        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return reservationManager.releaseOne({
          reservationId,
          outboxEventMetadata,
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
        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return reservationManager.createOne({
          createReservationInput: request.body,
          outboxEventMetadata,
        });
      },
    }),
  );
}

import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import {
  DEFAULT_PAYMENTS_LIMIT,
  MAX_PAYMENTS_LIMIT,
} from "../../constants/index.js";
import { paymentManager } from "../../managers/index.js";
import * as paymentSchema from "../schemas/payment.schema.js";

export function registerPaymentRoutes({ router }: { router: Router }) {
  router.get(
    "/",
    defineRoute({
      schemas: {
        query: paymentSchema.FindManyPaymentsQuery,
        response: paymentSchema.FindManyPaymentsResponse,
      },
      handler: async function ({ request }) {
        const { cursor, limit, orderId, status } = request.query;

        const requestedLimit = limit ?? DEFAULT_PAYMENTS_LIMIT;

        const query = {
          limit:
            requestedLimit > MAX_PAYMENTS_LIMIT
              ? MAX_PAYMENTS_LIMIT
              : requestedLimit,
          cursor,
          orderId,
          status,
        };

        return paymentManager.findMany({
          query,
        });
      },
    }),
  );

  router.get(
    "/:paymentId",
    defineRoute({
      schemas: {
        params: paymentSchema.FindOnePaymentParams,
        response: paymentSchema.FindOnePaymentResponse,
      },
      handler: async function ({ request }) {
        const { paymentId } = request.params;

        return paymentManager.findOne({
          paymentId,
        });
      },
    }),
  );
}

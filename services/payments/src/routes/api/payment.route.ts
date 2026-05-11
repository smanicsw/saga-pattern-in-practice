import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import {
  DEFAULT_PAYMENTS_LIMIT,
  MAX_PAYMENTS_LIMIT,
} from "../../constants/index.js";
import { paymentManager } from "../../managers/index.js";
import * as paymentSchema from "../schemas/payment.schema.js";

export function registerPaymentRoutes({ router }: { router: Router }) {
  router.post(
    "/authorize",
    defineRoute({
      schemas: {
        body: paymentSchema.AuthorizePaymentBody,
        response: paymentSchema.AuthorizePaymentResponse,
      },
      handler: async function ({ request }) {
        return paymentManager.authorize({
          authorizePaymentInput: request.body,
        });
      },
    }),
  );

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
    "/by-order/:orderId",
    defineRoute({
      schemas: {
        params: paymentSchema.FindOnePaymentByOrderIdParams,
        response: paymentSchema.FindOnePaymentByOrderIdResponse,
      },
      handler: async function ({ request }) {
        const { orderId } = request.params;

        return paymentManager.findOneByOrderId({
          orderId,
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

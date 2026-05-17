import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import {
  DEFAULT_ORDERS_LIMIT,
  MAX_ORDERS_LIMIT,
} from "../../../constants/index.js";
import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import { orderManager } from "../../../managers/index.js";
import getOutboxEventMetadata from "../../../tools/get-outbox-event-metadata.js";
import * as orderSchema from "../../schemas/order.schema.js";

export function registerOrderRoutes({ router }: { router: Router }) {
  router.post(
    "/orders",
    defineRoute({
      schemas: {
        body: orderSchema.CreateOneOrderBody,
        response: orderSchema.CreateOneOrderResponse,
      },
      status: 201,
      handler: async function ({ request }) {
        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return orderManager.createOne({
          createOrderInput: request.body,
          outboxEventMetadata,
        });
      },
    }),
  );

  router.post(
    "/orders/:orderId/confirm",
    defineRoute({
      schemas: {
        params: orderSchema.ConfirmOneOrderParams,
        response: orderSchema.ConfirmOneOrderResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { orderId } = request.params;
        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return orderManager.confirmOne({
          orderId,
          outboxEventMetadata,
        });
      },
    }),
  );

  router.post(
    "/orders/:orderId/cancel",
    defineRoute({
      schemas: {
        params: orderSchema.CancelOneOrderParams,
        response: orderSchema.CancelOneOrderResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { orderId } = request.params;
        const outboxEventMetadata = getOutboxEventMetadata({
          headers: request.req.headers,
        });

        return orderManager.cancelOne({
          orderId,
          outboxEventMetadata,
        });
      },
    }),
  );

  router.get(
    "/orders",
    defineRoute({
      schemas: {
        query: orderSchema.FindManyOrdersQuery,
        response: orderSchema.FindManyOrdersResponse,
      },
      handler: async function ({ request }) {
        const { cursor, customerId, limit, status } = request.query;

        const requestedLimit = limit ?? DEFAULT_ORDERS_LIMIT;

        const query = {
          limit:
            requestedLimit > MAX_ORDERS_LIMIT
              ? MAX_ORDERS_LIMIT
              : requestedLimit,
          cursor,
          customerId,
          status,
        };

        return orderManager.findMany({
          query,
        });
      },
    }),
  );

  router.get(
    "/orders/:orderId",
    defineRoute({
      schemas: {
        params: orderSchema.FindOneOrderParams,
        response: orderSchema.FindOneOrderResponse,
      },
      handler: async function ({ request }) {
        const { orderId } = request.params;

        return orderManager.findOne({
          orderId,
        });
      },
    }),
  );
}

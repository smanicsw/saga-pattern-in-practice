import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import {
  DEFAULT_ORDERS_LIMIT,
  MAX_ORDERS_LIMIT,
} from "../../../constants/index.js";
import { orderManager } from "../../../managers/index.js";
import * as orderSchema from "../../schemas/order.schema.js";

export function registerOrderRoutes({ router }: { router: Router }) {
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

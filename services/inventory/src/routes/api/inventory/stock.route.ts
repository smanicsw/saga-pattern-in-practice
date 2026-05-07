import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";

import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import * as stockManager from "../../../managers/stock.manager.js";
import * as stockSchema from "../../schemas/stock.schema.js";

export function registerStockRoutes({
  router,
}: {
  router: Router;
}) {
  router.get(
    "/stock/:productId",
    defineRoute({
      schemas: {
        params: stockSchema.FindOneStockParams,
        response: stockSchema.FindOneStockResponse,
      },
      handler: async function ({ request }) {
        const { productId } = request.params;

        return stockManager.findOneByProductId({
          productId,
        });
      },
    }),
  );

  router.patch(
    "/stock/:productId",
    defineRoute({
      schemas: {
        params: stockSchema.UpdateOneStockParams,
        body: stockSchema.UpdateOneStockBody,
        response: stockSchema.UpdateOneStockResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { productId } = request.params;

        return stockManager.updateOneByProductId({
          productId,
          updateStockInput: request.body,
        });
      },
    }),
  );
}

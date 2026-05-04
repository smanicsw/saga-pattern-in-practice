import type { Router } from "express";
import { withTransaction } from "../../../infrastructure/adapters/database/index.js";

import { validateBody } from "../../middlewares/validate-body.middleware.js";
import { withSuccess } from "../../middlewares/with-success.middleware.js";

import * as productManager from "../../../managers/product.manager.js";
import { CreateOneProductBody, CreateOneProductResponse } from "../../schemas/products.schema.js";

export function registerProductRoutes({
  router,
}: {
  router: Router;
}) {
  router.post(
    "/products",
    validateBody({ schema: CreateOneProductBody }),
    withSuccess({
      schema: CreateOneProductResponse,
      status: 201,
      handler: async ({ req }) => {
        return withTransaction({
          operation: async () => {
            return productManager.createOne({
              createProductInput: req.body,
            });
          },
        });
      },
    }),
  );
}

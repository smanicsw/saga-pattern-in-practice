import type { Router } from "express";
import { defineRoute } from "@saga/http-kit";
import { createOneProduct } from "../../../managers/index.js";
import { CreateOneProductBody, CreateOneProductResponse } from "../../schemas/index.js";
import { withTransaction } from "../../../infrastructure/adapters/database/index.js";

export function registerProductRoutes({
  router,
}: {
  router: Router;
}) {
  router.post(
    "/products",
    defineRoute({
      schemas: {
        body: CreateOneProductBody,
        response: CreateOneProductResponse,
      },
      status: 201,
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        return createOneProduct({
          createProductInput: request.body,
        });
      },
    }),
  );
}

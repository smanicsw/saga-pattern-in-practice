import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";
import {
  DEFAULT_PRODUCTS_LIMIT,
  MAX_PRODUCTS_LIMIT,
} from "../../../constants/index.js";
import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import { createOneProduct, findManyProducts } from "../../../managers/index.js";
import {
  CreateOneProductBody,
  CreateOneProductResponse,
  FindManyProductsQuery,
  FindManyProductsResponse,
} from "../../schemas/index.js";

export function registerProductRoutes({
  router,
}: {
  router: Router;
}) {
  router.get(
    "/products",
    defineRoute({
      schemas: {
        query: FindManyProductsQuery,
        response: FindManyProductsResponse,
      },
      handler: async function ({ request }) {
        const { cursor, limit } = request.query;

        const requestedLimit = limit ?? DEFAULT_PRODUCTS_LIMIT;

        const query = {
          limit:
            requestedLimit > MAX_PRODUCTS_LIMIT
              ? MAX_PRODUCTS_LIMIT
              : requestedLimit,
          cursor,
        };

        return findManyProducts({
          query,
        });
      },
    }),
  );

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

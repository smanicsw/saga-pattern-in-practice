import { defineRoute } from "@saga/http-kit";
import type { Router } from "express";
import {
  DEFAULT_PRODUCTS_LIMIT,
  MAX_PRODUCTS_LIMIT,
} from "../../../constants/index.js";
import { withTransaction } from "../../../infrastructure/adapters/database/index.js";
import * as productManager from "../../../managers/product.manager.js";
import * as productSchema from "../../schemas/products.schema.js";

export function registerProductRoutes({
  router,
}: {
  router: Router;
}) {
  router.get(
    "/products",
    defineRoute({
      schemas: {
        query: productSchema.FindManyProductsQuery,
        response: productSchema.FindManyProductsResponse,
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

        return productManager.findMany({
          query,
        });
      },
    }),
  );

  router.get(
    "/products/:productId",
    defineRoute({
      schemas: {
        params: productSchema.FindOneProductParams,
        response: productSchema.FindOneProductResponse,
      },
      handler: async function ({ request }) {
        const { productId } = request.params;

        return productManager.findOne({
          productId,
        });
      },
    }),
  );

  router.delete(
    "/products/:productId",
    defineRoute({
      schemas: {
        params: productSchema.DeleteOneProductParams,
      },
      status: 204,
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { productId } = request.params;

        await productManager.deleteOne({
          productId,
        });
      },
    }),
  );

  router.patch(
    "/products/:productId",
    defineRoute({
      schemas: {
        params: productSchema.UpdateOneProductParams,
        body: productSchema.UpdateOneProductBody,
        response: productSchema.UpdateOneProductResponse,
      },
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        const { productId } = request.params;

        return productManager.updateOne({
          productId,
          updateProductInput: request.body,
        });
      },
    }),
  );

  router.post(
    "/products",
    defineRoute({
      schemas: {
        body: productSchema.CreateOneProductBody,
        response: productSchema.CreateOneProductResponse,
      },
      status: 201,
      runInTransaction: (operation) => withTransaction({ operation }),
      handler: async function ({ request }) {
        return productManager.createOne({
          createProductInput: request.body,
        });
      },
    }),
  );
}

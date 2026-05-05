import type { Router } from "express";
import { defineRoute } from "@saga/http-kit";

import { healthResponseSchema } from "../schemas/index.js";

export function registerHealthRoute({ router }: { router: Router }) {
  router.get(
    "/health",
    defineRoute({
      schemas: {
        response: healthResponseSchema,
      },
      handler: async function () {
        return {
          service: "inventory",
          status: "ok",
        } as const;
      },
    }),
  );
}

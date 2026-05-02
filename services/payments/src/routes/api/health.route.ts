import type { Router } from "express";
import { Value } from "@sinclair/typebox/value";

import { healthResponseSchema } from "../schemas/index.js";

export function registerHealthRoute({ router }: { router: Router }) {
  router.get("/health", (_req, res) => {
    const response = Value.Parse(healthResponseSchema, {
      service: "payments",
      status: "ok",
    });

    res.status(200).json(response);
  });
}

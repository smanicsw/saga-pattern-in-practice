import type { Router } from "express";
import { Value } from "@sinclair/typebox/value";

import { createPaymentManager, type PaymentManager } from "../../../managers/index.js";
import { paymentOverviewResponseSchema } from "../../schemas/index.js";

export function registerPaymentRoute(
  router: Router,
  paymentManager: PaymentManager = createPaymentManager()
) {
  router.get("/", async (_req, res) => {
    const overview = await paymentManager.getOverview();
    const response = Value.Parse(paymentOverviewResponseSchema, overview);

    res.status(200).json(response);
  });
}

import type { Router } from "express";
import { defineRoute } from "@saga/http-kit";

import {
  createPaymentManager,
  type PaymentManager,
} from "../../../managers/index.js";
import { paymentOverviewResponseSchema } from "../../schemas/index.js";

export function registerPaymentRoute({
  router,
  paymentManager = createPaymentManager({}),
}: {
  router: Router;
  paymentManager?: PaymentManager;
}) {
  router.get(
    "/",
    defineRoute({
      schemas: {
        response: paymentOverviewResponseSchema,
      },
      handler: async function () {
        return paymentManager.getOverview();
      },
    }),
  );
}

import type { Router } from "express";
import { Value } from "@sinclair/typebox/value";

import {
  createOrderManager,
  type OrderManager,
} from "../../../managers/index.js";
import { orderOverviewResponseSchema } from "../../schemas/index.js";

export function registerOrderRoute({
  router,
  orderManager = createOrderManager({}),
}: {
  router: Router;
  orderManager?: OrderManager;
}) {
  router.get("/", async (_req, res) => {
    const overview = await orderManager.getOverview();
    const response = Value.Parse(orderOverviewResponseSchema, overview);

    res.status(200).json(response);
  });
}

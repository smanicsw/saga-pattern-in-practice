import type { Router } from "express";
import { Value } from "@sinclair/typebox/value";

import { createInventoryManager, type InventoryManager } from "../../../managers/index.js";
import { inventoryOverviewResponseSchema } from "../../schemas/index.js";

export function registerInventoryRoute(
  router: Router,
  inventoryManager: InventoryManager = createInventoryManager()
) {
  router.get("/", async (_req, res) => {
    const overview = await inventoryManager.getOverview();
    const response = Value.Parse(inventoryOverviewResponseSchema, overview);

    res.status(200).json(response);
  });
}

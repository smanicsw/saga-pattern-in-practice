import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerInventoryRoute } from "./inventory/index.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerInventoryRoute({ router: apiRoutes });

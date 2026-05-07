import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerProductRoutes } from "./inventory/products.route.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerProductRoutes({ router: apiRoutes });

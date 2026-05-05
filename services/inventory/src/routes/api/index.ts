import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerProductRoutes } from "./inventory/index.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerProductRoutes({ router: apiRoutes });

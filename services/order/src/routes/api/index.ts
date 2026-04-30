import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerOrderRoute } from "./order/index.js";

export const apiRoutes = Router();

registerHealthRoute(apiRoutes);
registerOrderRoute(apiRoutes);

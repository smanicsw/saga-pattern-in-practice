import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerOrderRoutes } from "./order/index.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerOrderRoutes({ router: apiRoutes });

import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerPaymentRoutes } from "./payment.route.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerPaymentRoutes({ router: apiRoutes });

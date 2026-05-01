import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerPaymentRoute } from "./payment/index.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerPaymentRoute({ router: apiRoutes });

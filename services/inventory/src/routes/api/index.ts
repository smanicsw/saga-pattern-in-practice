import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";
import { registerProductRoutes } from "./inventory/products.route.js";
import { registerReservationRoutes } from "./inventory/reservations.route.js";
import { registerStockRoutes } from "./inventory/stock.route.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });
registerProductRoutes({ router: apiRoutes });
registerStockRoutes({ router: apiRoutes });
registerReservationRoutes({ router: apiRoutes });

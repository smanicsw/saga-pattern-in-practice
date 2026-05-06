import { Router } from "express";

import { registerHealthRoute } from "./health.route.js";

export const apiRoutes = Router();

registerHealthRoute({ router: apiRoutes });

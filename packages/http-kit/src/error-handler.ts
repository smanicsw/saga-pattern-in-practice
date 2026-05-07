import type { ErrorRequestHandler } from "express";

import { HttpError } from "./errors.js";

export function createErrorHandler(): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({
        success: false,
        error: error.code,
        ...(process.env.EXPOSE_ERROR_DETAILS === "true" && error.details
          ? { details: error.details }
          : {}),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "internal_error",
    });
  };
}

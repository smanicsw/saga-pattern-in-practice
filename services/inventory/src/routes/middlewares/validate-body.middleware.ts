import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { RequestHandler } from "express";

export function validateBody({ schema }: { schema: TSchema }): RequestHandler {
  return (req, res, next) => {
    try {
      req.body = Value.Parse(schema, req.body);
      next();
    } catch {
      res.status(400).json({
        success: false,
        error: "invalid_request_body",
      });
    }
  };
}

import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { NextFunction, Request, RequestHandler, Response } from "express";

type Handler<TData> = ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}) => Promise<TData>;

export function withSuccess<TData>({
  schema,
  status = 200,
  handler,
}: {
  schema: TSchema;
  status?: number;
  handler: Handler<TData>;
}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await handler({ req, res });
      const parsed = Value.Parse(schema, data);

      res.status(status).json({
        success: true,
        data: parsed,
      });
    } catch (error) {
      next(error);
    }
  };
}

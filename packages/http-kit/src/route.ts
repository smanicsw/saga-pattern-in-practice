import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Request, RequestHandler } from "express";

import { BadRequestError } from "./errors.js";

type Infer<TSchemaOrUndefined extends TSchema | undefined> =
  TSchemaOrUndefined extends TSchema ? Static<TSchemaOrUndefined> : unknown;

const ROUTE_STATUS_TAG = "__route_status__";

export type RouteRequest<
  TBody extends TSchema | undefined,
  TParams extends TSchema | undefined,
  TQuery extends TSchema | undefined,
> = {
  req: Request;
  body: Infer<TBody>;
  params: Infer<TParams>;
  query: Infer<TQuery>;
};

type HandlerResult<TExpected> = TExpected | WithStatusResult<TExpected>;

type WithStatusResult<TExpected> = {
  [ROUTE_STATUS_TAG]: true;
  status: number;
  data: TExpected;
};

export function withStatus<TData>({
  status,
  data,
}: {
  status: number;
  data: TData;
}): WithStatusResult<TData> {
  return {
    [ROUTE_STATUS_TAG]: true,
    status,
    data,
  };
}

type RouteHandler<
  TBody extends TSchema | undefined,
  TParams extends TSchema | undefined,
  TQuery extends TSchema | undefined,
  TExpected,
> = ({
  request,
}: {
  request: RouteRequest<TBody, TParams, TQuery>;
}) => Promise<HandlerResult<TExpected>>;

export function defineRoute<
  TBody extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TResponse extends TSchema | undefined = undefined,
>({
  schemas,
  status = 200,
  runInTransaction,
  handler,
}: {
  schemas?: {
    body?: TBody;
    params?: TParams;
    query?: TQuery;
    response?: TResponse;
  };
  status?: number;
  runInTransaction?: <T>(operation: () => Promise<T>) => Promise<T>;
  handler: RouteHandler<TBody, TParams, TQuery, Infer<TResponse>>;
}): RequestHandler {
  return async (req, res, next) => {
    let body: unknown = req.body;
    let params: unknown = req.params;
    let query: unknown = req.query;

    try {
      if (schemas?.body) {
        body = parseInput({ schema: schemas.body, value: req.body });
      }
      if (schemas?.params) {
        params = parseInput({ schema: schemas.params, value: req.params });
      }
      if (schemas?.query) {
        query = parseInput({ schema: schemas.query, value: req.query });
      }
    } catch (error) {
      next(error);
      return;
    }

    const execute = async () => {
      return handler({
        request: {
          req,
          body: body as Infer<TBody>,
          params: params as Infer<TParams>,
          query: query as Infer<TQuery>,
        },
      });
    };

    try {
      const result = runInTransaction
        ? await runInTransaction(execute)
        : await execute();

      const { data, status: dynamicStatus } = normalizeHandlerResult(result);
      const responseStatus = dynamicStatus ?? status;

      if (responseStatus === 204) {
        res.status(204).end();
        return;
      }

      const parsed = schemas?.response ? Value.Parse(schemas.response, data) : data;

      res.status(responseStatus).json({
        success: true,
        data: parsed,
      });
    } catch (error) {
      next(error);
    }
  };
}

function parseInput<T extends TSchema>({
  schema,
  value,
}: {
  schema: T;
  value: unknown;
}) {
  try {
    return Value.Parse(schema, value);
  } catch {
    const details = [...Value.Errors(schema, value)].map((error) => ({
      path: error.path,
      message: error.message,
    }));

    throw new BadRequestError({ details });
  }
}

function normalizeHandlerResult<TExpected>(
  result: HandlerResult<TExpected>,
): { data: TExpected; status?: number } {
  if (isWithStatusResult(result)) {
    return {
      data: result.data,
      status: result.status,
    };
  }

  return {
    data: result as TExpected,
  };
}

function isWithStatusResult<TExpected>(
  value: HandlerResult<TExpected>,
): value is WithStatusResult<TExpected> {
  return (
    typeof value === "object" &&
    value !== null &&
    ROUTE_STATUS_TAG in value &&
    (value as { [ROUTE_STATUS_TAG]?: unknown })[ROUTE_STATUS_TAG] === true &&
    "status" in value &&
    typeof (value as { status?: unknown }).status === "number" &&
    "data" in value
  );
}

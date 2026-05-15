import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type PathParamValue = boolean | number | string;

export type ApiClientResponse<TData = unknown> = {
  status: number;
  data: TData;
};

export class ApiClientError extends Error {
  constructor({
    cause,
    kind,
    serviceName,
    status,
  }: {
    cause?: unknown;
    kind: "network" | "invalid_response";
    serviceName: string;
    status?: number;
  }) {
    super(`API client error for ${serviceName}: ${kind}`);
    this.name = "ApiClientError";
    this.cause = cause;
    this.kind = kind;
    this.serviceName = serviceName;
    this.status = status;
  }

  readonly cause?: unknown;
  readonly kind: "network" | "invalid_response";
  readonly serviceName: string;
  readonly status?: number;
}

type ApiClientErrorHandler = (error: ApiClientError) => never;

type MakeApiClientOptions = {
  baseUrl: string | (() => string);
  onError?: ApiClientErrorHandler;
  serviceName: string;
};

export type ApiClientRequestOptions<
  TResponseSchema extends TSchema | undefined = undefined,
> = {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, PathParamValue>;
  responseSchema?: TResponseSchema;
};

export type ApiClientData<TResponseSchema extends TSchema | undefined> =
  TResponseSchema extends TSchema ? Static<TResponseSchema> : unknown;

export function makeApiClient({
  baseUrl,
  onError,
  serviceName,
}: MakeApiClientOptions) {
  return {
    path: (path: string) => ({
      get: <TResponseSchema extends TSchema | undefined = undefined>(
        options?: ApiClientRequestOptions<TResponseSchema>,
      ) =>
        makeRequest({
          ...options,
          baseUrl,
          method: "GET",
          onError,
          path,
          serviceName,
        }),
      post: <TResponseSchema extends TSchema | undefined = undefined>(
        options?: ApiClientRequestOptions<TResponseSchema>,
      ) =>
        makeRequest({
          ...options,
          baseUrl,
          method: "POST",
          onError,
          path,
          serviceName,
        }),
      patch: <TResponseSchema extends TSchema | undefined = undefined>(
        options?: ApiClientRequestOptions<TResponseSchema>,
      ) =>
        makeRequest({
          ...options,
          baseUrl,
          method: "PATCH",
          onError,
          path,
          serviceName,
        }),
      put: <TResponseSchema extends TSchema | undefined = undefined>(
        options?: ApiClientRequestOptions<TResponseSchema>,
      ) =>
        makeRequest({
          ...options,
          baseUrl,
          method: "PUT",
          onError,
          path,
          serviceName,
        }),
      delete: <TResponseSchema extends TSchema | undefined = undefined>(
        options?: ApiClientRequestOptions<TResponseSchema>,
      ) =>
        makeRequest({
          ...options,
          baseUrl,
          method: "DELETE",
          onError,
          path,
          serviceName,
        }),
    }),
  };
}

async function makeRequest<TResponseSchema extends TSchema | undefined>({
  baseUrl,
  body,
  headers,
  method,
  onError,
  params,
  path,
  responseSchema,
  serviceName,
}: ApiClientRequestOptions<TResponseSchema> & {
  baseUrl: string | (() => string);
  method: HttpMethod;
  onError?: ApiClientErrorHandler;
  path: string;
  serviceName: string;
}): Promise<ApiClientResponse<ApiClientData<TResponseSchema>>> {
  let response: Response;

  try {
    response = await fetch(
      buildUrl({ baseUrl: resolveBaseUrl(baseUrl), params, path }),
      {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
    );
  } catch (error) {
    return handleError({
      error: new ApiClientError({
        cause: error,
        kind: "network",
        serviceName,
      }),
      onError,
    });
  }

  const data = await parseResponseBody({ onError, response, serviceName });

  if (response.ok && responseSchema) {
    try {
      return {
        status: response.status,
        data: Value.Parse(
          responseSchema,
          data,
        ) as ApiClientData<TResponseSchema>,
      };
    } catch (error) {
      return handleError({
        error: new ApiClientError({
          cause: error,
          kind: "invalid_response",
          serviceName,
          status: response.status,
        }),
        onError,
      });
    }
  }

  return {
    status: response.status,
    data: data as ApiClientData<TResponseSchema>,
  };
}

async function parseResponseBody({
  onError,
  response,
  serviceName,
}: {
  onError?: ApiClientErrorHandler;
  response: Response;
  serviceName: string;
}): Promise<unknown> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  return parseJson({ onError, rawBody, response, serviceName });
}

function parseJson({
  onError,
  rawBody,
  response,
  serviceName,
}: {
  onError?: ApiClientErrorHandler;
  rawBody: string;
  response: Response;
  serviceName: string;
}): unknown {
  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return handleError({
      error: new ApiClientError({
        cause: error,
        kind: "invalid_response",
        serviceName,
        status: response.status,
      }),
      onError,
    });
  }
}

function resolveBaseUrl(baseUrl: string | (() => string)): string {
  return typeof baseUrl === "function" ? baseUrl() : baseUrl;
}

function buildUrl({
  baseUrl,
  params,
  path,
}: {
  baseUrl: string;
  params?: Record<string, PathParamValue>;
  path: string;
}): string {
  const resolvedPath = Object.entries(params ?? {}).reduce(
    (currentPath, [key, value]) =>
      currentPath.replaceAll(`{${key}}`, encodeURIComponent(String(value))),
    path,
  );

  return `${baseUrl.replace(/\/$/, "")}/${resolvedPath.replace(/^\//, "")}`;
}

function handleError({
  error,
  onError,
}: {
  error: ApiClientError;
  onError?: ApiClientErrorHandler;
}): never {
  if (onError) {
    return onError(error);
  }

  throw error;
}

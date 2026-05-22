import {
  ORDER_SERVICE_BASE_URL,
  ORDER_SERVICE_NAME,
} from "../../../constants/index.js";
import {
  OrderRequestFailedError,
  OrderServiceUnavailableError,
} from "../../../errors/errors.js";
import { type PathParamValue, makeApiClient } from "../http/index.js";

const client = makeApiClient({
  baseUrl: () => ORDER_SERVICE_BASE_URL.value,
  onError: () => {
    throw new OrderServiceUnavailableError();
  },
  serviceName: ORDER_SERVICE_NAME,
});

type OrderRequestOptions = {
  allowNotFound?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, PathParamValue>;
};

type OrderSuccessEnvelope<TData> = {
  data: TData;
};

type OrderErrorEnvelope = {
  error?: unknown;
};

export const orderAdapter = {
  path: (path: string) => {
    const request = client.path(path);

    return {
      get: <TData = unknown>(options?: OrderRequestOptions) =>
        normalizeResponse<TData>(request.get(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
      post: <TData = unknown>(options?: OrderRequestOptions) =>
        normalizeResponse<TData>(request.post(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
    };
  },
};

async function normalizeResponse<TData>(
  request: Promise<{ status: number; data: unknown }>,
  {
    allowNotFound,
  }: {
    allowNotFound: boolean;
  },
): Promise<TData | null> {
  const response = await request;

  if (response.status === 404 && allowNotFound) {
    return null;
  }

  if (response.status < 200 || response.status >= 300) {
    throw new OrderRequestFailedError({
      upstreamError: extractErrorCode({ data: response.data }),
      upstreamStatus: response.status,
    });
  }

  return unwrapData<TData>(response.data);
}

function unwrapData<TData>(data: unknown): TData {
  if (typeof data === "object" && data !== null && "data" in data) {
    return (data as OrderSuccessEnvelope<TData>).data;
  }

  return data as TData;
}

function extractErrorCode({ data }: { data: unknown }): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as OrderErrorEnvelope).error === "string"
  ) {
    return (data as { error: string }).error;
  }

  return "unknown_order_error";
}

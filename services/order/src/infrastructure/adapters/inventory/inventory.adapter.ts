import {
  INVENTORY_SERVICE_BASE_URL,
  INVENTORY_SERVICE_NAME,
} from "../../../constants/index.js";
import {
  InventoryRequestFailedError,
  InventoryServiceUnavailableError,
} from "../../../errors/errors.js";
import {
  type PathParamValue,
  makeApiClient,
} from "../http/index.js";

const client = makeApiClient({
  baseUrl: () => INVENTORY_SERVICE_BASE_URL.value,
  onError: () => {
    throw new InventoryServiceUnavailableError();
  },
  serviceName: INVENTORY_SERVICE_NAME,
});

type InventoryRequestOptions = {
  allowNotFound?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, PathParamValue>;
};

type InventorySuccessEnvelope<TData> = {
  data: TData;
};

type InventoryErrorEnvelope = {
  error?: unknown;
};

export const inventoryAdapter = {
  path: (path: string) => {
    const request = client.path(path);

    return {
      get: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.get(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
      post: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.post(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
      patch: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.patch(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
      put: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.put(options), {
          allowNotFound: options?.allowNotFound ?? false,
        }),
      delete: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.delete(options), {
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
    throw new InventoryRequestFailedError({
      upstreamError: extractErrorCode({ data: response.data }),
      upstreamStatus: response.status,
    });
  }

  return unwrapData<TData>(response.data);
}

function unwrapData<TData>(data: unknown): TData {
  if (typeof data === "object" && data !== null && "data" in data) {
    return (data as InventorySuccessEnvelope<TData>).data;
  }

  return data as TData;
}

function extractErrorCode({ data }: { data: unknown }): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as InventoryErrorEnvelope).error === "string"
  ) {
    return (data as { error: string }).error;
  }

  return "unknown_inventory_error";
}

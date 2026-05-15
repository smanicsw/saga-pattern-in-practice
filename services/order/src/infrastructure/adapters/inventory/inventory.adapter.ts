import {
  INVENTORY_SERVICE_BASE_URL,
  INVENTORY_SERVICE_NAME,
} from "../../../constants/index.js";
import { InventoryServiceUnavailableError } from "../../../errors/errors.js";
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
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, PathParamValue>;
};

type InventorySuccessEnvelope<TData> = {
  data: TData;
};

export const inventoryAdapter = {
  path: (path: string) => {
    const request = client.path(path);

    return {
      get: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.get(options)),
      post: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.post(options)),
      patch: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.patch(options)),
      put: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.put(options)),
      delete: <TData = unknown>(options?: InventoryRequestOptions) =>
        normalizeResponse<TData>(request.delete(options)),
    };
  },
};

async function normalizeResponse<TData>(
  request: Promise<{ status: number; data: unknown }>,
): Promise<TData | null> {
  const response = await request;

  if (response.status === 404) {
    return null;
  }

  if (response.status < 200 || response.status >= 300) {
    throw new InventoryServiceUnavailableError();
  }

  return unwrapData<TData>(response.data);
}

function unwrapData<TData>(data: unknown): TData {
  if (typeof data === "object" && data !== null && "data" in data) {
    return (data as InventorySuccessEnvelope<TData>).data;
  }

  return data as TData;
}

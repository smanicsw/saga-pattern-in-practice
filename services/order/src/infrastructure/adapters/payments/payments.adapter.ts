import {
  PAYMENTS_SERVICE_BASE_URL,
  PAYMENTS_SERVICE_NAME,
} from "../../../constants/index.js";
import { PaymentsServiceUnavailableError } from "../../../errors/errors.js";
import {
  type PathParamValue,
  makeApiClient,
} from "../http/index.js";

const client = makeApiClient({
  baseUrl: () => PAYMENTS_SERVICE_BASE_URL.value,
  onError: () => {
    throw new PaymentsServiceUnavailableError();
  },
  serviceName: PAYMENTS_SERVICE_NAME,
});

type PaymentsRequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, PathParamValue>;
};

type PaymentsSuccessEnvelope<TData> = {
  data: TData;
};

export const paymentsAdapter = {
  path: (path: string) => {
    const request = client.path(path);

    return {
      get: <TData = unknown>(options?: PaymentsRequestOptions) =>
        normalizeResponse<TData>(request.get(options)),
      post: <TData = unknown>(options?: PaymentsRequestOptions) =>
        normalizeResponse<TData>(request.post(options)),
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
    throw new PaymentsServiceUnavailableError();
  }

  return unwrapData<TData>(response.data);
}

function unwrapData<TData>(data: unknown): TData {
  if (typeof data === "object" && data !== null && "data" in data) {
    return (data as PaymentsSuccessEnvelope<TData>).data;
  }

  return data as TData;
}

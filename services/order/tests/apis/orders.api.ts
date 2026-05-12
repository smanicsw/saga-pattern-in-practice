import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type { OrderList } from "../../src/entities/index.js";
import { getBaseUrl } from "./client.js";

type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
};

type ApiErrorResponse = {
  success: false;
  error: string;
};

type ApiResponse<TData> = {
  status: number;
  body: ApiSuccessResponse<TData> | ApiErrorResponse;
};

type ApiRequestOptions = {
  headers?: Record<string, string>;
};

export async function findMany({
  query,
  headers,
}: ApiRequestOptions & {
  query?: Record<string, string>;
} = {}): Promise<ApiResponse<OrderList>> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${SERVICE_API_PREFIX}/orders`);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<OrderList>["body"],
  };
}

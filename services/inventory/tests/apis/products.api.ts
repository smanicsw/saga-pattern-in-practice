import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type { Product } from "../../src/entities/index.js";
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

export async function createOne({
  body,
  headers,
}: ApiRequestOptions & {
  body: unknown;
}): Promise<ApiResponse<Product>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}${SERVICE_API_PREFIX}/products`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Product>["body"],
  };
}

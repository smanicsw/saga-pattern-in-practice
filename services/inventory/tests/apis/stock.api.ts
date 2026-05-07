import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type { Stock } from "../../src/entities/stock.entity.js";
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

export async function findOne({
  productId,
  headers,
}: ApiRequestOptions & {
  productId: string;
}): Promise<ApiResponse<Stock>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/stock/${productId}`,
    {
      method: "GET",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Stock>["body"],
  };
}

export async function updateOne({
  productId,
  body,
  headers,
}: ApiRequestOptions & {
  productId: string;
  body: unknown;
}): Promise<ApiResponse<Stock>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/stock/${productId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Stock>["body"],
  };
}

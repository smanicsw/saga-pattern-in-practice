import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type { Product, ProductList } from "../../src/entities/index.js";
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

export async function findMany({
  query,
  headers,
}: ApiRequestOptions & {
  query?: Record<string, string>;
} = {}): Promise<ApiResponse<ProductList>> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${SERVICE_API_PREFIX}/products`);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<ProductList>["body"],
  };
}

export async function findOne({
  productId,
  headers,
}: ApiRequestOptions & {
  productId: string;
}): Promise<ApiResponse<Product>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/products/${productId}`,
    {
      method: "GET",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Product>["body"],
  };
}

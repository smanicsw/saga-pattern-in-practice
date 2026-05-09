import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type {
  Payment,
  PaymentList,
} from "../../src/entities/payment.entity.js";
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
} = {}): Promise<ApiResponse<PaymentList>> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${SERVICE_API_PREFIX}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<PaymentList>["body"],
  };
}

export async function findOne({
  paymentId,
  headers,
}: ApiRequestOptions & {
  paymentId: string;
}): Promise<ApiResponse<Payment>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}${SERVICE_API_PREFIX}/${paymentId}`, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Payment>["body"],
  };
}

export async function findOneByOrderId({
  orderId,
  headers,
}: ApiRequestOptions & {
  orderId: string;
}): Promise<ApiResponse<Payment>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/by-order/${orderId}`,
    {
      method: "GET",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Payment>["body"],
  };
}

import { SERVICE_API_PREFIX } from "../../src/constants/index.js";
import type { Reservation } from "../../src/entities/reservation.entity.js";
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
}): Promise<ApiResponse<Reservation>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}${SERVICE_API_PREFIX}/reservations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Reservation>["body"],
  };
}

export async function findOne({
  reservationId,
  headers,
}: ApiRequestOptions & {
  reservationId: string;
}): Promise<ApiResponse<Reservation>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/reservations/${reservationId}`,
    {
      method: "GET",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Reservation>["body"],
  };
}

export async function findOneByOrderId({
  orderId,
  headers,
}: ApiRequestOptions & {
  orderId: string;
}): Promise<ApiResponse<Reservation>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/reservations/by-order/${orderId}`,
    {
      method: "GET",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Reservation>["body"],
  };
}

export async function confirmOne({
  reservationId,
  headers,
}: ApiRequestOptions & {
  reservationId: string;
}): Promise<ApiResponse<Reservation>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/reservations/${reservationId}/confirm`,
    {
      method: "POST",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Reservation>["body"],
  };
}

export async function releaseOne({
  reservationId,
  headers,
}: ApiRequestOptions & {
  reservationId: string;
}): Promise<ApiResponse<Reservation>> {
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}${SERVICE_API_PREFIX}/reservations/${reservationId}/release`,
    {
      method: "POST",
      headers,
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as ApiResponse<Reservation>["body"],
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(message);
  }
}

export async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(readErrorMessage(payload), response.status, payload);
  }

  return unwrapResponse<TResponse>(payload);
}

function readErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Request failed";
}

function unwrapResponse<TResponse>(payload: unknown): TResponse {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload &&
    (payload as { success: unknown }).success === true
  ) {
    return (payload as { data: TResponse }).data;
  }

  return payload as TResponse;
}

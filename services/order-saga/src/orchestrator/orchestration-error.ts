import { InventoryRequestFailedError } from "../errors/errors.js";

export function isInventoryReservationBusinessFailure({
  error,
}: {
  error: unknown;
}): boolean {
  return (
    error instanceof InventoryRequestFailedError &&
    error.upstreamStatus >= 400 &&
    error.upstreamStatus < 500 &&
    [
      "insufficient_stock",
      "stock_not_found",
      "product_not_found",
      "invalid_reservation_status",
    ].includes(error.upstreamError)
  );
}

export function isInventoryRequestFailureCode({
  code,
  error,
}: {
  code: string;
  error: unknown;
}): boolean {
  return (
    error instanceof InventoryRequestFailedError && error.upstreamError === code
  );
}

export function getErrorMessage({ error }: { error: unknown }): string {
  if (error instanceof InventoryRequestFailedError) {
    return `${error.message} (${error.upstreamError})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown orchestration error.";
}

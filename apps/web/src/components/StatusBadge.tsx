import type { OrderStatus, ReservationStatus } from "../api/types";

type Status = OrderStatus | ReservationStatus;

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>{status}</span>
  );
}

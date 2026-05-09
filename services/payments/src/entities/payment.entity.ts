import type { CursorPagination } from "./pagination.entity.js";

export type PaymentId = string;
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "FAILED" | "REFUNDED";

export type Payment = {
  id: PaymentId;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerRef: string | null;
  failureReason: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRow = {
  id: PaymentId;
  order_id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider_ref: string | null;
  failure_reason: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PaymentList = {
  items: Payment[];
  pagination: CursorPagination;
};

export type PaymentFilters = {
  orderId?: string;
  status?: PaymentStatus;
};

export type FindManyPaymentsQuery = PaymentFilters & {
  limit: number;
  cursor?: string;
};

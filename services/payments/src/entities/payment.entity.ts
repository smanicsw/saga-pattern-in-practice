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

export type AuthorizePaymentInput = {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodToken?: string;
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

export type NewPayment = Omit<Payment, "id">;

export type NewPaymentRow = Omit<PaymentRow, "id">;

export type UpdatePayment = Partial<
  Pick<Payment, "status" | "providerRef" | "failureReason">
> & {
  updatedAt: string;
};

export type UpdatePaymentRow = Partial<
  Pick<PaymentRow, "status" | "provider_ref" | "failure_reason" | "updated_at">
>;

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

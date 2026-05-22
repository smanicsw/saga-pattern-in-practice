import type { OrderId } from "./order.entity.js";

export type OrderSagaId = string;

export type OrderSagaStatus =
  | "STARTED"
  | "RESERVATION_CREATED"
  | "PAYMENT_AUTHORIZED"
  | "RESERVATION_CONFIRMED"
  | "COMPLETED"
  | "COMPENSATING"
  | "FAILED";

export type OrderSagaStep =
  | "RESERVE_INVENTORY"
  | "AUTHORIZE_PAYMENT"
  | "CONFIRM_RESERVATION"
  | "CONFIRM_ORDER"
  | "COMPENSATE"
  | "COMPLETED"
  | "FAILED";

export type OrderSagaFailureReason = {
  message: string;
};

export type OrderSaga = {
  id: OrderSagaId;
  orderId: OrderId;
  status: OrderSagaStatus;
  currentStep: OrderSagaStep;
  reservationId: string | null;
  paymentId: string | null;
  paymentMethodToken: string | null;
  failureReason: OrderSagaFailureReason | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderSagaRow = {
  id: OrderSagaId;
  order_id: OrderId;
  status: OrderSagaStatus;
  current_step: OrderSagaStep;
  reservation_id: string | null;
  payment_id: string | null;
  payment_method_token: string | null;
  failure_reason: OrderSagaFailureReason | null;
  created_at: string;
  updated_at: string;
};

export type NewOrderSaga = Omit<OrderSaga, "id">;

export type NewOrderSagaRow = Omit<OrderSagaRow, "id">;

export type UpdateOrderSagaReservationCreated = Pick<
  OrderSaga,
  "status" | "currentStep" | "reservationId" | "failureReason" | "updatedAt"
>;

export type UpdateOrderSagaReservationCreatedRow = Pick<
  OrderSagaRow,
  "status" | "current_step" | "reservation_id" | "failure_reason" | "updated_at"
>;

export type UpdateOrderSagaPaymentAuthorized = Pick<
  OrderSaga,
  "status" | "currentStep" | "paymentId" | "failureReason" | "updatedAt"
>;

export type UpdateOrderSagaPaymentAuthorizedRow = Pick<
  OrderSagaRow,
  "status" | "current_step" | "payment_id" | "failure_reason" | "updated_at"
>;

export type UpdateOrderSagaReservationConfirmed = Pick<
  OrderSaga,
  "status" | "currentStep" | "failureReason" | "updatedAt"
>;

export type UpdateOrderSagaReservationConfirmedRow = Pick<
  OrderSagaRow,
  "status" | "current_step" | "failure_reason" | "updated_at"
>;

export type UpdateOrderSagaCompleted = Pick<
  OrderSaga,
  "status" | "currentStep" | "failureReason" | "updatedAt"
>;

export type UpdateOrderSagaCompletedRow = Pick<
  OrderSagaRow,
  "status" | "current_step" | "failure_reason" | "updated_at"
>;

export type UpdateOrderSagaFailed = Pick<
  OrderSaga,
  "status" | "currentStep" | "failureReason" | "updatedAt"
>;

export type UpdateOrderSagaFailedRow = Pick<
  OrderSagaRow,
  "status" | "current_step" | "failure_reason" | "updated_at"
>;

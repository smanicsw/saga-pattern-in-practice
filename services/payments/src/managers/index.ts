export * as outboxEventManager from "./outbox-event.manager.js";
export * as paymentManager from "./payment.manager.js";

export function createPaymentManager({}: Record<string, never>) {
  return {
    getOverview: async () => ({
      message: "Payments service is running",
      next: "Implement payment authorization endpoints",
      totalPayments: 0,
    }),
  };
}

import type { Payment } from "../entities/index.js";

export interface PaymentRepository {
  findAll(): Promise<Payment[]>;
}

export function createPaymentRepository(): PaymentRepository {
  const payments: Payment[] = [];

  return {
    async findAll() {
      return payments;
    }
  };
}

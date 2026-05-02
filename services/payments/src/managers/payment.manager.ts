import {
  createPaymentRepository,
  type PaymentRepository,
} from "../repositories/index.js";

export interface PaymentOverview {
  message: string;
  next: string;
  totalPayments: number;
}

export interface PaymentManager {
  getOverview(): Promise<PaymentOverview>;
}

export function createPaymentManager({
  paymentRepository = createPaymentRepository(),
}: {
  paymentRepository?: PaymentRepository;
} = {}): PaymentManager {
  return {
    async getOverview() {
      const payments = await paymentRepository.findAll();

      return {
        message: "Payments service is running",
        next: "Authorize and capture payments as part of the order saga.",
        totalPayments: payments.length,
      };
    },
  };
}

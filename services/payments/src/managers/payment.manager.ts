import type {
  FindManyPaymentsQuery,
  Payment,
  PaymentId,
  PaymentList,
} from "../entities/payment.entity.js";
import { PaymentNotFoundError } from "../errors/errors.js";
import * as paymentRepository from "../repositories/payment.repository.js";

export async function findMany({
  query,
}: {
  query: FindManyPaymentsQuery;
}): Promise<PaymentList> {
  return paymentRepository.findMany({
    query,
  });
}

export async function findOne({
  paymentId,
}: {
  paymentId: PaymentId;
}): Promise<Payment> {
  const payment = await paymentRepository.findOne({
    paymentId,
  });

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  return payment;
}

import type {
  FindManyPaymentsQuery,
  Payment,
  PaymentId,
  PaymentList,
  PaymentRow,
} from "../entities/payment.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function findMany({
  query,
}: {
  query: FindManyPaymentsQuery;
}): Promise<PaymentList> {
  const db = getQueryBuilder();

  const paymentRows: PaymentRow[] = await db<PaymentRow>("payments")
    .select([
      "id",
      "order_id",
      "amount",
      "currency",
      "status",
      "provider_ref",
      "failure_reason",
      "created_at",
      "updated_at",
    ])
    .modify((queryBuilder) => {
      if (query.orderId) {
        queryBuilder.where("order_id", query.orderId);
      }

      if (query.status) {
        queryBuilder.where("status", query.status);
      }

      if (!query.cursor) {
        return;
      }

      queryBuilder.whereRaw(
        "(created_at, id) > (select created_at, id from payments where id = ?)",
        [query.cursor],
      );
    })
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .limit(query.limit + 1);

  const pageRows = paymentRows.slice(0, query.limit);

  const nextCursor =
    paymentRows.length > query.limit ? pageRows[pageRows.length - 1].id : null;

  return {
    items: pageRows.map((paymentRow) => transformFromRow({ paymentRow })),
    pagination: {
      limit: query.limit,
      nextCursor,
    },
  };
}

export async function findOne({
  paymentId,
}: {
  paymentId: PaymentId;
}): Promise<Payment | null> {
  const db = getQueryBuilder();

  const paymentRow = await db<PaymentRow>("payments")
    .select([
      "id",
      "order_id",
      "amount",
      "currency",
      "status",
      "provider_ref",
      "failure_reason",
      "created_at",
      "updated_at",
    ])
    .where("id", paymentId)
    .first();

  if (!paymentRow) {
    return null;
  }

  return transformFromRow({ paymentRow });
}

export async function findOneByOrderId({
  orderId,
}: {
  orderId: string;
}): Promise<Payment | null> {
  const db = getQueryBuilder();

  const paymentRow = await db<PaymentRow>("payments")
    .select([
      "id",
      "order_id",
      "amount",
      "currency",
      "status",
      "provider_ref",
      "failure_reason",
      "created_at",
      "updated_at",
    ])
    .where("order_id", orderId)
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .first();

  if (!paymentRow) {
    return null;
  }

  return transformFromRow({ paymentRow });
}

function transformFromRow({ paymentRow }: { paymentRow: PaymentRow }): Payment {
  return {
    id: paymentRow.id,
    orderId: paymentRow.order_id,
    amount: Number(paymentRow.amount),
    currency: paymentRow.currency,
    status: paymentRow.status,
    providerRef: paymentRow.provider_ref,
    failureReason: paymentRow.failure_reason,
    createdAt: toStringValue(paymentRow.created_at),
    updatedAt: toStringValue(paymentRow.updated_at),
  };
}

import type {
  FindManyOrdersQuery,
  Order,
  OrderId,
  OrderItem,
  OrderItemRow,
  OrderList,
  OrderRow,
} from "../entities/index.js";
import { getDatabase } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function findMany({
  query,
}: {
  query: FindManyOrdersQuery;
}): Promise<OrderList> {
  const db = getDatabase();

  const orderRows: OrderRow[] = await db<OrderRow>("orders")
    .select([
      "id",
      "customer_id",
      "status",
      "total_amount",
      "currency",
      "created_at",
      "updated_at",
    ])
    .modify((queryBuilder) => {
      if (query.status) {
        queryBuilder.where("status", query.status);
      }

      if (query.customerId) {
        queryBuilder.where("customer_id", query.customerId);
      }

      if (!query.cursor) {
        return;
      }

      queryBuilder.whereRaw(
        "(created_at, id) > (select created_at, id from orders where id = ?)",
        [query.cursor],
      );
    })
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .limit(query.limit + 1);

  const pageRows = orderRows.slice(0, query.limit);

  const nextCursor =
    orderRows.length > query.limit ? pageRows[pageRows.length - 1].id : null;

  const orderItemsByOrderId = await findItemsByOrderId({
    orderIds: pageRows.map((orderRow) => orderRow.id),
  });

  return {
    items: pageRows.map((orderRow) =>
      transformFromRow({
        orderRow,
        orderItems: orderItemsByOrderId.get(orderRow.id) ?? [],
      }),
    ),
    pagination: {
      limit: query.limit,
      nextCursor,
    },
  };
}

export async function findOne({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Order | null> {
  const db = getDatabase();

  const orderRow = await db<OrderRow>("orders")
    .select([
      "id",
      "customer_id",
      "status",
      "total_amount",
      "currency",
      "created_at",
      "updated_at",
    ])
    .where("id", orderId)
    .first();

  if (!orderRow) {
    return null;
  }

  const orderItemsByOrderId = await findItemsByOrderId({
    orderIds: [orderId],
  });

  return transformFromRow({
    orderRow,
    orderItems: orderItemsByOrderId.get(orderRow.id) ?? [],
  });
}

async function findItemsByOrderId({
  orderIds,
}: {
  orderIds: string[];
}): Promise<Map<string, OrderItem[]>> {
  if (orderIds.length === 0) {
    return new Map();
  }

  const db = getDatabase();

  const orderItemRows: OrderItemRow[] = await db<OrderItemRow>("order_items")
    .select([
      "id",
      "order_id",
      "product_id",
      "quantity",
      "unit_price_snapshot",
      "line_total_snapshot",
      "sku_snapshot",
      "name_snapshot",
      "created_at",
      "updated_at",
    ])
    .whereIn("order_id", orderIds)
    .orderBy("created_at", "asc")
    .orderBy("id", "asc");

  return orderItemRows.reduce<Map<string, OrderItem[]>>(
    (itemsByOrderId, orderItemRow) => {
      const orderItems = itemsByOrderId.get(orderItemRow.order_id) ?? [];

      orderItems.push(transformItemFromRow({ orderItemRow }));

      itemsByOrderId.set(orderItemRow.order_id, orderItems);

      return itemsByOrderId;
    },
    new Map(),
  );
}

function transformFromRow({
  orderRow,
  orderItems,
}: {
  orderRow: OrderRow;
  orderItems: OrderItem[];
}): Order {
  return {
    id: orderRow.id,
    customerId: orderRow.customer_id,
    status: orderRow.status,
    totalAmount: Number(orderRow.total_amount),
    currency: orderRow.currency,
    items: orderItems,
    createdAt: toStringValue(orderRow.created_at),
    updatedAt: toStringValue(orderRow.updated_at),
  };
}

function transformItemFromRow({
  orderItemRow,
}: {
  orderItemRow: OrderItemRow;
}): OrderItem {
  return {
    id: orderItemRow.id,
    orderId: orderItemRow.order_id,
    productId: orderItemRow.product_id,
    quantity: orderItemRow.quantity,
    unitPriceSnapshot: Number(orderItemRow.unit_price_snapshot),
    lineTotalSnapshot: Number(orderItemRow.line_total_snapshot),
    skuSnapshot: orderItemRow.sku_snapshot,
    nameSnapshot: orderItemRow.name_snapshot,
    createdAt: toStringValue(orderItemRow.created_at),
    updatedAt: toStringValue(orderItemRow.updated_at),
  };
}

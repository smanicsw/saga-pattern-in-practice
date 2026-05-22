import type { CursorPagination } from "./pagination.entity.js";

export type OrderId = string;
export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type OrderItem = {
  id: string;
  orderId: OrderId;
  productId: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotalSnapshot: number;
  skuSnapshot: string;
  nameSnapshot: string;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: OrderId;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  customerId: string;
  paymentMethodToken?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type OrderRow = {
  id: OrderId;
  customer_id: string;
  status: OrderStatus;
  total_amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: OrderId;
  product_id: string;
  quantity: number;
  unit_price_snapshot: string;
  line_total_snapshot: string;
  sku_snapshot: string;
  name_snapshot: string;
  created_at: string;
  updated_at: string;
};

export type NewOrder = Omit<Order, "id" | "items">;

export type NewOrderRow = Omit<OrderRow, "id">;

export type NewOrderItem = Omit<OrderItem, "id" | "orderId">;

export type NewOrderItemRow = Omit<OrderItemRow, "id">;

export type UpdateOrderStatus = Pick<Order, "status" | "updatedAt">;

export type UpdateOrderStatusRow = Pick<OrderRow, "status" | "updated_at">;

export type OrderList = {
  items: Order[];
  pagination: CursorPagination;
};

export type OrderFilters = {
  status?: OrderStatus;
  customerId?: string;
};

export type FindManyOrdersQuery = OrderFilters & {
  limit: number;
  cursor?: string;
};

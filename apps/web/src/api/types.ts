export type Pagination = {
  limit: number;
  nextCursor: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductList = {
  items: Product[];
  pagination: Pagination;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  description?: string;
  price: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
};

export type Stock = {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type OrderItem = {
  id: string;
  orderId: string;
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
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type OrderList = {
  items: Order[];
  pagination: Pagination;
};

export type CreateOrderInput = {
  customerId: string;
  paymentMethodToken?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED" | "FAILED";

export type Reservation = {
  id: string;
  orderId: string;
  status: ReservationStatus;
  products: Array<{
    id: string;
    reservationId: string;
    productId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

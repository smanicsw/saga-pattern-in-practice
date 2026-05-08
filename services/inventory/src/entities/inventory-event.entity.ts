import type { Product, ProductId } from "./product.entity.js";
import type {
  Reservation,
  ReservationProduct,
  ReservationStatus,
} from "./reservation.entity.js";
import type { Stock } from "./stock.entity.js";

export const InventoryEventType = {
  ProductCreated: "inventory.product.created",
  ProductUpdated: "inventory.product.updated",
  ProductDeleted: "inventory.product.deleted",
  StockUpdated: "inventory.stock.updated",
  ReservationCreated: "inventory.reservation.created",
  ReservationConfirmed: "inventory.reservation.confirmed",
  ReservationReleased: "inventory.reservation.released",
} as const;

export type InventoryEventType =
  (typeof InventoryEventType)[keyof typeof InventoryEventType];

export const InventoryEventVersion = {
  ProductCreated: 1,
  ProductUpdated: 1,
  ProductDeleted: 1,
  StockUpdated: 1,
  ReservationCreated: 1,
  ReservationConfirmed: 1,
  ReservationReleased: 1,
} as const;

export type ProductCreatedPayload = {
  current: Product;
};

export type ProductUpdatedPayload = {
  productId: ProductId;
  previous: Partial<Pick<Product, "name" | "description" | "price">>;
  current: Partial<Pick<Product, "name" | "description" | "price">>;
};

export type ProductDeletedPayload = {
  previous: Product;
};

export type StockQuantityChange = {
  productId: ProductId;
  previous: Partial<Pick<Stock, "availableQuantity" | "reservedQuantity">>;
  current: Partial<Pick<Stock, "availableQuantity" | "reservedQuantity">>;
};

export type StockUpdatedPayload = {
  stockId: Stock["id"];
  productId: ProductId;
  previous: Partial<Pick<Stock, "availableQuantity" | "reservedQuantity">>;
  current: Partial<Pick<Stock, "availableQuantity" | "reservedQuantity">>;
};

export type ReservationEventProduct = Pick<
  ReservationProduct,
  "productId" | "quantity"
>;

export type ReservationCreatedPayload = {
  current: Reservation;
};

export type ReservationConfirmedPayload = {
  reservation: {
    id: Reservation["id"];
    orderId: Reservation["orderId"];
    previous: {
      status: Extract<ReservationStatus, "PENDING">;
    };
    current: {
      status: Extract<ReservationStatus, "CONFIRMED">;
    };
  };
  products: ReservationEventProduct[];
  stockChanges: StockQuantityChange[];
};

export type ReservationReleasedPayload = {
  reservation: {
    id: Reservation["id"];
    orderId: Reservation["orderId"];
    previous: {
      status: Extract<ReservationStatus, "PENDING">;
    };
    current: {
      status: Extract<ReservationStatus, "RELEASED">;
    };
  };
  products: ReservationEventProduct[];
  stockChanges: StockQuantityChange[];
};

export type InventoryEventPayloadByType = {
  [InventoryEventType.ProductCreated]: ProductCreatedPayload;
  [InventoryEventType.ProductUpdated]: ProductUpdatedPayload;
  [InventoryEventType.ProductDeleted]: ProductDeletedPayload;
  [InventoryEventType.StockUpdated]: StockUpdatedPayload;
  [InventoryEventType.ReservationCreated]: ReservationCreatedPayload;
  [InventoryEventType.ReservationConfirmed]: ReservationConfirmedPayload;
  [InventoryEventType.ReservationReleased]: ReservationReleasedPayload;
};

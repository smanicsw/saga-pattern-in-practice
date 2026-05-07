import { Static, Type } from "@sinclair/typebox";

export const StockResponse = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    productId: Type.String({ format: "uuid" }),
    availableQuantity: Type.Integer({ minimum: 0 }),
    reservedQuantity: Type.Integer({ minimum: 0 }),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
);

export type StockResponse = Static<typeof StockResponse>;

export const FindOneStockParams = Type.Object({
  productId: Type.String({ format: "uuid" }),
});

export type FindOneStockParams = Static<typeof FindOneStockParams>;

export const FindOneStockResponse = StockResponse;

export type FindOneStockResponse = Static<typeof FindOneStockResponse>;

export const UpdateOneStockParams = Type.Object({
  productId: Type.String({ format: "uuid" }),
});

export type UpdateOneStockParams = Static<typeof UpdateOneStockParams>;

export const UpdateOneStockBody = Type.Object(
  {
    availableQuantity: Type.Integer({ minimum: 0 }),
  },
  {
    additionalProperties: false,
  },
);

export type UpdateOneStockBody = Static<typeof UpdateOneStockBody>;

export const UpdateOneStockResponse = StockResponse;

export type UpdateOneStockResponse = Static<typeof UpdateOneStockResponse>;

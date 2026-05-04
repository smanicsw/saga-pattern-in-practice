import { Static, Type } from "@sinclair/typebox";

export const CreateOneProductBody = Type.Object(
  {
    sku: Type.String({ minLength: 1, maxLength: 120 }),
    name: Type.String({ minLength: 1, maxLength: 255 }),
    price: Type.Number({ minimum: 0 }),
  },
);

export type CreateOneProductBody = Static<typeof CreateOneProductBody>;

export const CreateOneProductResponse = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    sku: Type.String(),
    name: Type.String(),
    price: Type.Number({ minimum: 0 }),
    currency: Type.String({ minLength: 3, maxLength: 3 }),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  }
);

export type CreateOneProductResponse = Static<typeof CreateOneProductResponse>;

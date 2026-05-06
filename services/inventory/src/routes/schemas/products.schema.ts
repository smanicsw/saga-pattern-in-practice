import { Static, Type } from "@sinclair/typebox";
import { DEFAULT_PRODUCTS_LIMIT } from "../../constants/index.js";

export const ProductResponse = Type.Object(
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

export type ProductResponse = Static<typeof ProductResponse>;

export const CreateOneProductBody = Type.Object(
  {
    sku: Type.String({ minLength: 1, maxLength: 120 }),
    name: Type.String({ minLength: 1, maxLength: 255 }),
    price: Type.Number({ minimum: 0 }),
  },
);

export type CreateOneProductBody = Static<typeof CreateOneProductBody>;

export const CreateOneProductResponse = ProductResponse;

export type CreateOneProductResponse = Static<typeof CreateOneProductResponse>;

export const FindOneProductParams = Type.Object({
  productId: Type.String({ format: "uuid" }),
});

export type FindOneProductParams = Static<typeof FindOneProductParams>;

export const FindOneProductResponse = ProductResponse;

export type FindOneProductResponse = Static<typeof FindOneProductResponse>;

export const DeleteOneProductParams = Type.Object({
  productId: Type.String({ format: "uuid" }),
});

export type DeleteOneProductParams = Static<typeof DeleteOneProductParams>;

export const FindManyProductsQuery = Type.Object(
  {
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        default: DEFAULT_PRODUCTS_LIMIT,
      }),
    ),
    cursor: Type.Optional(Type.String({ format: "uuid" })),
  }
);

export type FindManyProductsQuery = Static<typeof FindManyProductsQuery>;

export const FindManyProductsResponse = Type.Object(
  {
    items: Type.Array(ProductResponse),
    pagination: Type.Object(
      {
        limit: Type.Integer({ minimum: 1 }),
        nextCursor: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
      }
    ),
  }
);

export type FindManyProductsResponse = Static<typeof FindManyProductsResponse>;

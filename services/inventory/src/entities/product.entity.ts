
export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  price: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  price: number;
};


export type NewProduct = Omit<Product, "id">;

export type NewProductRow = Omit<ProductRow, "id">;

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Edit3, PackagePlus, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  createProduct,
  deleteProduct,
  getStock,
  listProducts,
  updateProduct,
  updateStock,
} from "../api/products";
import type { Product, Stock } from "../api/types";
import { Message } from "../components/Message";
import { Modal } from "../components/Modal";

type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  price: string;
};

type StockFormState = {
  product: Product;
  availableQuantity: string;
};

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  description: "",
  price: "",
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState<StockFormState | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({ limit: 50 }),
  });

  const products = productsQuery.data?.items ?? [];
  const stockQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: ["stock", product.id],
      queryFn: () => getStock(product.id),
      enabled: products.length > 0,
    })),
  });

  const stockByProductId = useMemo(() => {
    return new Map(
      stockQueries
        .map((query) => query.data)
        .filter((stock): stock is Stock => Boolean(stock))
        .map((stock) => [stock.productId, stock]),
    );
  }, [stockQueries]);

  const invalidateProducts = () => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["stock"] });
  };

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      setProductForm(emptyProductForm);
      invalidateProducts();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      product,
    }: {
      productId: string;
      product: ProductFormState;
    }) =>
      updateProduct(productId, {
        name: product.name,
        description: product.description.trim() ? product.description : null,
        price: Number(product.price),
      }),
    onSuccess: () => {
      setEditingProduct(null);
      invalidateProducts();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidateProducts,
  });

  const stockMutation = useMutation({
    mutationFn: ({
      productId,
      availableQuantity,
    }: {
      productId: string;
      availableQuantity: number;
    }) => updateStock(productId, availableQuantity),
    onSuccess: () => {
      setStockForm(null);
      invalidateProducts();
    },
  });

  function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createMutation.mutate({
      sku: productForm.sku.trim(),
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      price: Number(productForm.price),
    });
  }

  function handleUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProduct) {
      return;
    }

    updateMutation.mutate({
      productId: editingProduct.id,
      product: {
        sku: editingProduct.sku,
        name: editingProduct.name.trim(),
        description: editingProduct.description ?? "",
        price: String(editingProduct.price),
      },
    });
  }

  function handleUpdateStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stockForm) {
      return;
    }

    stockMutation.mutate({
      productId: stockForm.product.id,
      availableQuantity: Number(stockForm.availableQuantity),
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Products</h1>
        </div>
      </header>

      <section className="surface">
        <div className="section-heading">
          <h2>Create product</h2>
        </div>
        <form className="inline-form" onSubmit={handleCreateProduct}>
          <label>
            SKU
            <input
              maxLength={120}
              onChange={(event) =>
                setProductForm({ ...productForm, sku: event.target.value })
              }
              required
              value={productForm.sku}
            />
          </label>
          <label>
            Name
            <input
              maxLength={255}
              onChange={(event) =>
                setProductForm({ ...productForm, name: event.target.value })
              }
              required
              value={productForm.name}
            />
          </label>
          <label>
            Description
            <input
              maxLength={2000}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  description: event.target.value,
                })
              }
              value={productForm.description}
            />
          </label>
          <label>
            Price
            <input
              min="0"
              onChange={(event) =>
                setProductForm({ ...productForm, price: event.target.value })
              }
              required
              step="0.01"
              type="number"
              value={productForm.price}
            />
          </label>
          <button disabled={createMutation.isPending} type="submit">
            <PackagePlus size={16} />
            Create
          </button>
        </form>
        {createMutation.error ? (
          <Message tone="danger">{createMutation.error.message}</Message>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-heading">
          <h2>Product list</h2>
          <span>{products.length} loaded</span>
        </div>
        {productsQuery.isLoading ? (
          <Message>Loading products...</Message>
        ) : null}
        {productsQuery.error ? (
          <Message tone="danger">{productsQuery.error.message}</Message>
        ) : null}
        {!productsQuery.isLoading && products.length === 0 ? (
          <Message>No products yet.</Message>
        ) : null}
        {products.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = stockByProductId.get(product.id);

                  return (
                    <tr key={product.id}>
                      <td className="mono">{product.sku}</td>
                      <td>
                        <strong>{product.name}</strong>
                        <span className="muted">
                          {product.description || "No description"}
                        </span>
                      </td>
                      <td>{formatMoney(product.price, product.currency)}</td>
                      <td>{stock?.availableQuantity ?? "..."}</td>
                      <td>{stock?.reservedQuantity ?? "..."}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label={`Edit ${product.name}`}
                            className="icon-button"
                            onClick={() => setEditingProduct(product)}
                            type="button"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            aria-label={`Update stock for ${product.name}`}
                            className="icon-button"
                            onClick={() =>
                              setStockForm({
                                product,
                                availableQuantity: String(
                                  stock?.availableQuantity ?? 0,
                                ),
                              })
                            }
                            type="button"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            aria-label={`Delete ${product.name}`}
                            className="icon-button danger"
                            onClick={() => {
                              if (confirm(`Delete ${product.name}?`)) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {editingProduct ? (
        <Modal onClose={() => setEditingProduct(null)} title="Edit product">
          <form className="stack-form" onSubmit={handleUpdateProduct}>
            <label>
              Name
              <input
                maxLength={255}
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    name: event.target.value,
                  })
                }
                required
                value={editingProduct.name}
              />
            </label>
            <label>
              Description
              <textarea
                maxLength={2000}
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    description: event.target.value,
                  })
                }
                value={editingProduct.description ?? ""}
              />
            </label>
            <label>
              Price
              <input
                min="0"
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    price: Number(event.target.value),
                  })
                }
                required
                step="0.01"
                type="number"
                value={editingProduct.price}
              />
            </label>
            <button disabled={updateMutation.isPending} type="submit">
              <Save size={16} />
              Save
            </button>
            {updateMutation.error ? (
              <Message tone="danger">{updateMutation.error.message}</Message>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {stockForm ? (
        <Modal onClose={() => setStockForm(null)} title="Update stock">
          <form className="stack-form" onSubmit={handleUpdateStock}>
            <label>
              Available quantity
              <input
                min="0"
                onChange={(event) =>
                  setStockForm({
                    ...stockForm,
                    availableQuantity: event.target.value,
                  })
                }
                required
                type="number"
                value={stockForm.availableQuantity}
              />
            </label>
            <button disabled={stockMutation.isPending} type="submit">
              <Save size={16} />
              Save
            </button>
            {stockMutation.error ? (
              <Message tone="danger">{stockMutation.error.message}</Message>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount);
}

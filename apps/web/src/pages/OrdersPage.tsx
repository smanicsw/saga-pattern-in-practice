import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Ban, Check, CirclePlus, Eye } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  cancelOrder,
  confirmOrder,
  createOrder,
  getReservationByOrderId,
  listOrders,
} from "../api/orders";
import { getStock, listProducts } from "../api/products";
import type { Order, OrderStatus, Stock } from "../api/types";
import { Message } from "../components/Message";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";

type OrderItemDraft = {
  productId: string;
  quantity: string;
};

const orderStatuses: Array<OrderStatus | ""> = [
  "",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
];

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [customerId, setCustomerId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [items, setItems] = useState<OrderItemDraft[]>([
    { productId: "", quantity: "1" },
  ]);

  const ordersQuery = useQuery({
    queryKey: ["orders", status, customerId],
    queryFn: () =>
      listOrders({
        status,
        customerId: customerId.trim() || undefined,
        limit: 50,
      }),
  });

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

  const reservationQuery = useQuery({
    queryKey: ["reservation-by-order", selectedOrder?.id],
    queryFn: () => getReservationByOrderId(selectedOrder!.id),
    enabled: Boolean(selectedOrder),
    retry: false,
  });

  const refreshOrders = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["stock"] });
    void queryClient.invalidateQueries({ queryKey: ["reservation-by-order"] });
  };

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setCreateOpen(false);
      setNewCustomerId("");
      setItems([{ productId: "", quantity: "1" }]);
      refreshOrders();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmOrder,
    onSuccess: refreshOrders,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: refreshOrders,
  });

  const orders = ordersQuery.data?.items ?? [];

  function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createMutation.mutate({
      customerId: newCustomerId.trim(),
      items: items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Order service</p>
          <h1>Orders</h1>
        </div>
        <button onClick={() => setCreateOpen(true)} type="button">
          <CirclePlus size={16} />
          New order
        </button>
      </header>

      <section className="surface">
        <div className="filter-bar">
          <label>
            Status
            <select
              onChange={(event) =>
                setStatus(event.target.value as OrderStatus | "")
              }
              value={status}
            >
              {orderStatuses.map((orderStatus) => (
                <option key={orderStatus || "ALL"} value={orderStatus}>
                  {orderStatus || "ALL"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer
            <input
              onChange={(event) => setCustomerId(event.target.value)}
              placeholder="customer-id"
              value={customerId}
            />
          </label>
        </div>
      </section>

      <section className="surface">
        <div className="section-heading">
          <h2>Order list</h2>
          <span>{orders.length} loaded</span>
        </div>
        {ordersQuery.isLoading ? <Message>Loading orders...</Message> : null}
        {ordersQuery.error ? (
          <Message tone="danger">{ordersQuery.error.message}</Message>
        ) : null}
        {!ordersQuery.isLoading && orders.length === 0 ? (
          <Message>No orders found.</Message>
        ) : null}
        {orders.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="mono">{shortId(order.id)}</td>
                    <td>{order.customerId}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{formatMoney(order.totalAmount, order.currency)}</td>
                    <td>{order.items.length}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label={`View ${order.id}`}
                          className="icon-button"
                          onClick={() => setSelectedOrder(order)}
                          type="button"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          aria-label={`Confirm ${order.id}`}
                          className="icon-button"
                          disabled={order.status !== "PENDING"}
                          onClick={() => confirmMutation.mutate(order.id)}
                          type="button"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          aria-label={`Cancel ${order.id}`}
                          className="icon-button danger"
                          disabled={order.status !== "PENDING"}
                          onClick={() => cancelMutation.mutate(order.id)}
                          type="button"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <Modal onClose={() => setCreateOpen(false)} title="New order">
          <form className="stack-form" onSubmit={handleCreateOrder}>
            <label>
              Customer
              <input
                maxLength={120}
                onChange={(event) => setNewCustomerId(event.target.value)}
                required
                value={newCustomerId}
              />
            </label>
            <div className="item-stack">
              {items.map((item, index) => {
                const stock = stockByProductId.get(item.productId);

                return (
                  <div className="order-item-row" key={index}>
                    <label>
                      Product
                      <select
                        onChange={(event) => {
                          const nextItems = [...items];
                          nextItems[index] = {
                            ...item,
                            productId: event.target.value,
                          };
                          setItems(nextItems);
                        }}
                        required
                        value={item.productId}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} - {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Qty
                      <input
                        min="1"
                        onChange={(event) => {
                          const nextItems = [...items];
                          nextItems[index] = {
                            ...item,
                            quantity: event.target.value,
                          };
                          setItems(nextItems);
                        }}
                        required
                        type="number"
                        value={item.quantity}
                      />
                    </label>
                    <span className="stock-note">
                      Available {stock?.availableQuantity ?? "-"} / Reserved{" "}
                      {stock?.reservedQuantity ?? "-"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() =>
                  setItems([...items, { productId: "", quantity: "1" }])
                }
                type="button"
              >
                Add item
              </button>
              <button disabled={createMutation.isPending} type="submit">
                <CirclePlus size={16} />
                Create
              </button>
            </div>
            {createMutation.error ? (
              <Message tone="danger">{createMutation.error.message}</Message>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {selectedOrder ? (
        <Modal onClose={() => setSelectedOrder(null)} title="Order details">
          <div className="detail-stack">
            <div className="detail-grid">
              <span>Order</span>
              <strong className="mono">{selectedOrder.id}</strong>
              <span>Status</span>
              <StatusBadge status={selectedOrder.status} />
              <span>Total</span>
              <strong>
                {formatMoney(selectedOrder.totalAmount, selectedOrder.currency)}
              </strong>
            </div>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="mono">{item.skuSnapshot}</td>
                      <td>{item.nameSnapshot}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {formatMoney(
                          item.lineTotalSnapshot,
                          selectedOrder.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="reservation-box">
              {reservationQuery.isLoading ? (
                <Message>Loading reservation...</Message>
              ) : null}
              {reservationQuery.data ? (
                <div className="detail-grid">
                  <span>Reservation</span>
                  <strong className="mono">
                    {shortId(reservationQuery.data.id)}
                  </strong>
                  <span>Status</span>
                  <StatusBadge status={reservationQuery.data.status} />
                </div>
              ) : null}
              {reservationQuery.error ? (
                <Message>No reservation found for this order.</Message>
              ) : null}
            </div>
          </div>
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function shortId(id: string) {
  return id.slice(0, 8);
}

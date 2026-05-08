# Inventory Service

The Inventory service owns product catalog data, stock levels, inventory reservations, and inventory outbox events.

Base URL in local development:

```txt
http://localhost:3003/api/v1/inventory
```

## Responsibilities

- Store products and immutable SKUs.
- Create a stock row for each product.
- Track `availableQuantity` and `reservedQuantity`.
- Reserve stock for an order.
- Confirm a reservation after payment succeeds.
- Release a reservation when an order is cancelled or a saga step fails.
- Persist outbox events transactionally with state changes.
- Publish pending outbox events from a separate worker process.

## Runtime Components

- API process: `src/index.ts`
- Express app: `src/app.ts`
- Outbox worker: `src/outbox/worker.ts`
- Database: PostgreSQL
- Migrations: `src/infrastructure/adapters/database/migrations`
- Message publisher adapter: `src/infrastructure/adapters/message-broker/event-publisher.ts`

The current message publisher is a stub that logs published events. It can be replaced by a real broker adapter later without changing the outbox table or event creation flow.

## Commands

Run the API locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_inventory@localhost:5435/inventory_db
corepack pnpm --filter @saga/inventory-service db:migrate:latest
corepack pnpm dev:inventory
```

Run the outbox worker locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_inventory@localhost:5435/inventory_db
corepack pnpm --filter @saga/inventory-service outbox:worker
```

Run Inventory tests:

```bash
corepack pnpm test:up -- inventory
corepack pnpm test -- inventory
corepack pnpm test:down -- inventory
```

Run only Inventory functional tests:

```bash
corepack pnpm test:functional -- inventory
```

Run service checks:

```bash
corepack pnpm --filter @saga/inventory-service typecheck
corepack pnpm --filter @saga/inventory-service lint
corepack pnpm --filter @saga/inventory-service build
```

## Response Envelope

Successful responses, except `204 No Content`, are wrapped as:

```json
{
  "success": true,
  "data": {}
}
```

Errors are wrapped as:

```json
{
  "success": false,
  "error": "error_code"
}
```

Validation errors use `400` with `error: "invalid_request"`. When `EXPOSE_ERROR_DETAILS=true`, validation responses also include `details`.

## Optional Trace Headers

Mutation endpoints read these optional headers:

- `x-correlation-id`
- `x-causation-id`

Both must be UUIDs when provided. They are stored in the outbox event metadata and are meant to trace saga commands and retries across services.

## Data Model

### `products`

- `id`
- `sku`, unique
- `name`
- `description`, nullable
- `price`
- `currency`, currently `EUR`
- `created_at`
- `updated_at`

### `stock`

- `id`
- `product_id`, unique, references `products.id`
- `available_quantity`
- `reserved_quantity`
- `created_at`
- `updated_at`

### `reservations`

- `id`
- `order_id`, unique
- `status`: `PENDING`, `CONFIRMED`, `RELEASED`, or `FAILED`
- `created_at`
- `updated_at`

### `reservation_products`

- `id`
- `reservation_id`
- `product_id`
- `quantity`
- `created_at`
- `updated_at`

### `outbox_events`

- event identity and envelope: `id`, `event_type`, `event_version`, `action`, `service`, `aggregate_type`, `aggregate_id`, `payload`
- trace metadata: `correlation_id`, `causation_id`, `occurred_at`
- delivery state: `status`, `published_at`, `dead_lettered_at`, `attempts`, `next_attempt_at`, `last_error`
- audit fields: `created_at`, `updated_at`

## API Endpoints

### Health

#### `GET /health`

Response:

```json
{
  "success": true,
  "data": {
    "service": "inventory",
    "status": "ok"
  }
}
```

## Products

### `POST /products`

Creates a product and a stock row with `availableQuantity = 0` and `reservedQuantity = 0`.

This endpoint is idempotent by `sku`. If the SKU already exists, the existing product is returned and no new outbox event is created.

Request:

```json
{
  "sku": "SKU-123",
  "name": "Keyboard",
  "description": "Mechanical keyboard",
  "price": 49.99
}
```

Rules:

- `sku`: required string, 1 to 120 chars
- `name`: required string, 1 to 255 chars
- `description`: optional string, 1 to 2000 chars
- `price`: required number, minimum `0`

Response status: `201`

Response data:

```json
{
  "id": "product-id",
  "sku": "SKU-123",
  "name": "Keyboard",
  "description": "Mechanical keyboard",
  "price": 49.99,
  "currency": "EUR",
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z"
}
```

Outbox event on new product:

- `type`: `inventory.product.created`
- `action`: `create`
- `aggregate.type`: `product`
- `payload.current`: created product

### `GET /products`

Lists products with cursor pagination.

Query:

- `limit`: optional integer, minimum `1`, default `20`; values above `100` are capped to `100`
- `cursor`: optional product UUID

Example:

```txt
GET /products?limit=20&cursor=product-id
```

Response data:

```json
{
  "items": [
    {
      "id": "product-id",
      "sku": "SKU-123",
      "name": "Keyboard",
      "description": null,
      "price": 49.99,
      "currency": "EUR",
      "createdAt": "2026-05-08T10:00:00.000Z",
      "updatedAt": "2026-05-08T10:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": null
  }
}
```

### `GET /products/:productId`

Returns one product by UUID.

Errors:

- `404 product_not_found`

### `PATCH /products/:productId`

Partially updates a product. At least one property must be provided.

Request:

```json
{
  "name": "Keyboard Pro",
  "description": null,
  "price": 59.99
}
```

Rules:

- `name`: optional string, 1 to 255 chars
- `description`: optional string, 1 to 2000 chars, or `null` to clear it
- `price`: optional number, minimum `0`

If the provided values are the same as the current values, the existing product is returned and no outbox event is created.

Outbox event when data changes:

- `type`: `inventory.product.updated`
- `action`: `update`
- `aggregate.type`: `product`
- `payload.previous`: only changed fields before the update
- `payload.current`: only changed fields after the update

Errors:

- `404 product_not_found`

### `DELETE /products/:productId`

Deletes a product. Deleting a product cascades to its stock row.

Response status: `204`

This endpoint is idempotent. Deleting a missing product still returns `204` and creates no outbox event.

Outbox event when an existing product is deleted:

- `type`: `inventory.product.deleted`
- `action`: `delete`
- `aggregate.type`: `product`
- `payload.previous`: deleted product

## Stock

### `GET /stock/:productId`

Returns stock by product UUID.

Response data:

```json
{
  "id": "stock-id",
  "productId": "product-id",
  "availableQuantity": 10,
  "reservedQuantity": 0,
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z"
}
```

Errors:

- `404 stock_not_found`

### `PATCH /stock/:productId`

Updates the manually controlled available quantity for a product.

Request:

```json
{
  "availableQuantity": 10
}
```

Rules:

- `availableQuantity`: required integer, minimum `0`

The endpoint does not directly update `reservedQuantity`; reservations own reserved stock changes.

If the provided available quantity equals the current value, the existing stock row is returned and no outbox event is created.

Outbox event when data changes:

- `type`: `inventory.stock.updated`
- `action`: `update`
- `aggregate.type`: `stock`
- `payload.previous.availableQuantity`
- `payload.current.availableQuantity`

Errors:

- `404 stock_not_found`

## Reservations

Reservations are the Inventory participant in the order saga. A reservation is tied to a unique `orderId`.

### `POST /reservations`

Creates a pending reservation and reserves stock for its products.

Request:

```json
{
  "orderId": "order-id",
  "products": [
    {
      "productId": "product-id-1",
      "quantity": 2
    },
    {
      "productId": "product-id-2",
      "quantity": 1
    }
  ]
}
```

Rules:

- `orderId`: required UUID
- `products`: required non-empty array
- `products[].productId`: required UUID
- `products[].quantity`: required integer, minimum `1`

Duplicate product IDs in the same request are aggregated before stock is reserved.

This endpoint is idempotent by `orderId`. If a reservation already exists for the order, the existing reservation with products is returned and stock is not reserved again.

Stock changes:

- decrement `availableQuantity` by the reserved quantity
- increment `reservedQuantity` by the reserved quantity

Response status: `201`

Response data:

```json
{
  "id": "reservation-id",
  "orderId": "order-id",
  "status": "PENDING",
  "products": [
    {
      "id": "reservation-product-id",
      "reservationId": "reservation-id",
      "productId": "product-id-1",
      "quantity": 2,
      "createdAt": "2026-05-08T10:00:00.000Z",
      "updatedAt": "2026-05-08T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z"
}
```

Outbox event on new reservation:

- `type`: `inventory.reservation.created`
- `action`: `create`
- `aggregate.type`: `reservation`
- `payload.current`: created reservation with products

Errors:

- `404 stock_not_found`
- `409 insufficient_stock`

### `GET /reservations/:reservationId`

Returns one reservation with products.

Errors:

- `404 reservation_not_found`

### `GET /reservations/by-order/:orderId`

Returns one reservation with products by order UUID. This is useful for saga recovery when the orchestrator knows the order ID but not the reservation ID.

Errors:

- `404 reservation_not_found`

### `POST /reservations/:reservationId/confirm`

Confirms a pending reservation after payment succeeds.

Valid transition:

```txt
PENDING -> CONFIRMED
```

Stock changes:

- leave `availableQuantity` unchanged
- decrement `reservedQuantity` by the reserved quantity

This endpoint is idempotent once the reservation is already `CONFIRMED`; it returns the current confirmed reservation and does not update stock again.

Outbox event when the reservation changes:

- `type`: `inventory.reservation.confirmed`
- `action`: `update`
- `aggregate.type`: `reservation`
- `payload.reservation.previous.status`: `PENDING`
- `payload.reservation.current.status`: `CONFIRMED`
- `payload.products`: confirmed products and quantities
- `payload.stockChanges`: stock before/after values

Errors:

- `404 reservation_not_found`
- `409 invalid_reservation_status`
- `409 insufficient_reserved_stock`

### `POST /reservations/:reservationId/release`

Releases a pending reservation when the order is cancelled or a later saga step fails.

Valid transition:

```txt
PENDING -> RELEASED
```

Stock changes:

- increment `availableQuantity` by the reserved quantity
- decrement `reservedQuantity` by the reserved quantity

This endpoint is idempotent once the reservation is already `RELEASED`; it returns the current released reservation and does not update stock again.

Outbox event when the reservation changes:

- `type`: `inventory.reservation.released`
- `action`: `update`
- `aggregate.type`: `reservation`
- `payload.reservation.previous.status`: `PENDING`
- `payload.reservation.current.status`: `RELEASED`
- `payload.products`: released products and quantities
- `payload.stockChanges`: stock before/after values

Errors:

- `404 reservation_not_found`
- `409 invalid_reservation_status`
- `409 insufficient_reserved_stock`

## Reservation Flow

### Successful saga path

1. Order service creates a pending order.
2. Order service calls `POST /reservations`.
3. Inventory creates a `PENDING` reservation and moves quantity from available to reserved.
4. Order service calls Payments.
5. If payment succeeds, Order service calls `POST /reservations/:reservationId/confirm`.
6. Inventory marks the reservation `CONFIRMED` and consumes the reserved quantity.
7. Order service confirms the order.

### Compensation path

1. Order service creates a pending order.
2. Order service calls `POST /reservations`.
3. Inventory creates a `PENDING` reservation and reserves stock.
4. Payment fails, times out, or the order is cancelled.
5. Order service calls `POST /reservations/:reservationId/release`.
6. Inventory marks the reservation `RELEASED` and restores available stock.
7. Order service cancels the order.

## Idempotency Summary

| Endpoint                                    | Idempotency behavior                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `POST /products`                            | Idempotent by unique `sku`; returns existing product.               |
| `DELETE /products/:productId`               | Idempotent; missing product returns `204`.                          |
| `PATCH /products/:productId`                | Same values return current product without a new event.             |
| `PATCH /stock/:productId`                   | Same `availableQuantity` returns current stock without a new event. |
| `POST /reservations`                        | Idempotent by unique `orderId`; returns existing reservation.       |
| `POST /reservations/:reservationId/confirm` | Idempotent when already `CONFIRMED`.                                |
| `POST /reservations/:reservationId/release` | Idempotent when already `RELEASED`.                                 |

## Outbox Events

Mutation endpoints create outbox events in the same database transaction as the business change. No event is created for read endpoints or idempotent no-op returns.

Current event types:

- `inventory.product.created`
- `inventory.product.updated`
- `inventory.product.deleted`
- `inventory.stock.updated`
- `inventory.reservation.created`
- `inventory.reservation.confirmed`
- `inventory.reservation.released`

Event envelope:

```json
{
  "id": "event-id",
  "type": "inventory.reservation.confirmed",
  "version": 1,
  "action": "update",
  "service": "inventory",
  "aggregate": {
    "type": "reservation",
    "id": "reservation-id"
  },
  "occurredAt": "2026-05-08T10:00:00.000Z",
  "correlationId": "correlation-id",
  "causationId": "causation-id",
  "payload": {}
}
```

Outbox delivery statuses:

- `PENDING`: ready now or scheduled for a future retry
- `PUBLISHED`: successfully published by the worker
- `DEAD_LETTERED`: failed too many times and will not be retried automatically

Worker behavior:

- polls `outbox_events` for `PENDING` rows where `next_attempt_at <= now`
- processes up to `25` events per batch
- publishes to topic `outbox-events.inventory`
- uses the aggregate ID as the message key
- marks successful events as `PUBLISHED`
- retries failures with exponential backoff capped at `60s`
- dead-letters an event after `10` failed publish attempts
- sleeps for `5s` when there are no pending events

## Error Codes

| Status | Error code                    | Meaning                                                          |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| `400`  | `invalid_request`             | Request params, query, or body failed validation.                |
| `404`  | `product_not_found`           | Product was not found.                                           |
| `404`  | `stock_not_found`             | Stock row was not found.                                         |
| `404`  | `reservation_not_found`       | Reservation was not found.                                       |
| `409`  | `insufficient_stock`          | Available stock is lower than requested reservation quantity.    |
| `409`  | `insufficient_reserved_stock` | Reserved stock is lower than requested confirm/release quantity. |
| `409`  | `invalid_reservation_status`  | Requested reservation transition is not allowed.                 |
| `500`  | `internal_error`              | Unexpected server error.                                         |

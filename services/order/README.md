# Order Service

The Order service owns customer orders, immutable order item snapshots, and order outbox events.

Base URL in local development:

```txt
http://localhost:3001/api/v1/order
```

## Responsibilities

- Create pending orders from requested products and quantities.
- Read product snapshots from the Inventory service before persisting an order.
- Store order totals, currency, SKU snapshots, name snapshots, and price snapshots.
- Confirm or cancel pending orders.
- Persist outbox events transactionally with order state changes.
- Publish pending outbox events from a separate worker process.

## Runtime Components

- API process: `src/index.ts`
- Express app: `src/app.ts`
- Outbox worker: `src/outbox/worker.ts`
- Database: PostgreSQL
- Migrations: `src/infrastructure/adapters/database/migrations`
- Inventory HTTP adapter: `src/infrastructure/adapters/inventory/inventory.adapter.ts`
- Message publisher adapter: `src/infrastructure/adapters/message-broker/event-publisher.ts`
- Broker topic: `outbox-events.order`

The Order service does not reserve inventory or authorize payments directly. It emits `order.order.created`, and the Order Saga worker consumes that event to coordinate Inventory and Payments.

## Commands

Run the API locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_order@localhost:5433/order_db
export INVENTORY_SERVICE_BASE_URL=http://localhost:3003
corepack pnpm --filter @saga/order-service db:migrate:latest
corepack pnpm dev:order
```

Run the outbox worker locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_order@localhost:5433/order_db
export KAFKA_BROKERS=localhost:9092
corepack pnpm --filter @saga/order-service outbox:worker
```

Run Order tests:

```bash
corepack pnpm test:up -- order
corepack pnpm test -- order
corepack pnpm test:down -- order
```

Run only Order functional tests:

```bash
corepack pnpm test:functional -- order
```

Run service checks:

```bash
corepack pnpm --filter @saga/order-service typecheck
corepack pnpm --filter @saga/order-service lint
corepack pnpm --filter @saga/order-service build
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

Both must be UUIDs when provided. They are stored in order outbox event metadata so saga commands and retries can be traced across services.

## Data Model

### `orders`

- `id`
- `customer_id`
- `status`: `PENDING`, `CONFIRMED`, or `CANCELLED`
- `total_amount`
- `currency`
- `created_at`
- `updated_at`

### `order_items`

- `id`
- `order_id`
- `product_id`
- `quantity`
- `unit_price_snapshot`
- `line_total_snapshot`
- `sku_snapshot`
- `name_snapshot`
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
    "service": "order",
    "status": "ok"
  }
}
```

## Orders

### `POST /orders`

Creates a pending order. The service fetches each product from Inventory, snapshots price/SKU/name data, aggregates duplicate product IDs in the request, and calculates totals from cents to avoid floating point drift.

Request:

```json
{
  "customerId": "customer-123",
  "paymentMethodToken": "tok_visa",
  "items": [
    {
      "productId": "product-id",
      "quantity": 2
    }
  ]
}
```

Rules:

- `customerId`: required string, 1 to 120 chars
- `paymentMethodToken`: optional string, 1 to 255 chars
- `items`: required non-empty array
- `items[].productId`: required UUID
- `items[].quantity`: required integer, minimum `1`

Response status: `201`

Response data:

```json
{
  "id": "order-id",
  "customerId": "customer-123",
  "status": "PENDING",
  "totalAmount": 99.98,
  "currency": "EUR",
  "items": [
    {
      "id": "order-item-id",
      "orderId": "order-id",
      "productId": "product-id",
      "quantity": 2,
      "unitPriceSnapshot": 49.99,
      "lineTotalSnapshot": 99.98,
      "skuSnapshot": "SKU-123",
      "nameSnapshot": "Keyboard",
      "createdAt": "2026-05-08T10:00:00.000Z",
      "updatedAt": "2026-05-08T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z"
}
```

Outbox event:

- `type`: `order.order.created`
- `action`: `create`
- `aggregate.type`: `order`
- `payload.current`: created order
- `payload.paymentMethodToken`: token forwarded for the saga, or `null`

Errors:

- `404 product_not_found`
- `409 order_currency_mismatch`
- `502 inventory_service_unavailable`
- `502 inventory_request_failed`

### `GET /orders`

Lists orders with cursor pagination.

Query:

- `status`: optional `PENDING`, `CONFIRMED`, or `CANCELLED`
- `customerId`: optional string, 1 to 120 chars
- `limit`: optional integer, minimum `1`, default `20`; values above `100` are capped to `100`
- `cursor`: optional order UUID

Example:

```txt
GET /orders?status=PENDING&customerId=customer-123&limit=20&cursor=order-id
```

Response data:

```json
{
  "items": [],
  "pagination": {
    "limit": 20,
    "nextCursor": null
  }
}
```

### `GET /orders/:orderId`

Returns one order with its item snapshots.

Errors:

- `404 order_not_found`

### `POST /orders/:orderId/confirm`

Confirms a pending order.

Valid transition:

```txt
PENDING -> CONFIRMED
```

This endpoint is idempotent once the order is already `CONFIRMED`; it returns the current confirmed order and does not create another outbox event.

Outbox event when the order changes:

- `type`: `order.order.confirmed`
- `action`: `update`
- `aggregate.type`: `order`
- `payload.order.previous.status`: `PENDING`
- `payload.order.current.status`: `CONFIRMED`

Errors:

- `404 order_not_found`
- `409 invalid_order_status`

### `POST /orders/:orderId/cancel`

Cancels a pending order.

Valid transition:

```txt
PENDING -> CANCELLED
```

This endpoint is idempotent once the order is already `CANCELLED`; it returns the current cancelled order and does not create another outbox event.

Outbox event when the order changes:

- `type`: `order.order.cancelled`
- `action`: `update`
- `aggregate.type`: `order`
- `payload.order.previous.status`: `PENDING`
- `payload.order.current.status`: `CANCELLED`

Errors:

- `404 order_not_found`
- `409 invalid_order_status`

## Idempotency Summary

| Endpoint                              | Idempotency behavior                         |
| ------------------------------------- | -------------------------------------------- |
| `POST /orders`                        | Creates a new order each successful request. |
| `POST /orders/:orderId/confirm`       | Idempotent when already `CONFIRMED`.         |
| `POST /orders/:orderId/cancel`        | Idempotent when already `CANCELLED`.         |
| `GET /orders`, `GET /orders/:orderId` | Read-only; no outbox events.                 |

## Outbox Events

Mutation endpoints create outbox events in the same database transaction as the order change. No event is created for read endpoints or idempotent no-op returns.

Current event types:

- `order.order.created`
- `order.order.confirmed`
- `order.order.cancelled`

Event envelope:

```json
{
  "id": "event-id",
  "type": "order.order.created",
  "version": 1,
  "action": "create",
  "service": "order",
  "aggregate": {
    "type": "order",
    "id": "order-id"
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
- publishes to topic `outbox-events.order`
- uses the aggregate ID as the message key
- marks successful events as `PUBLISHED`
- retries failures with exponential backoff capped at `60s`
- dead-letters an event after `10` failed publish attempts
- sleeps for `5s` when there are no pending events

## Error Codes

| Status | Error code                      | Meaning                                            |
| ------ | ------------------------------- | -------------------------------------------------- |
| `400`  | `invalid_request`               | Request params, query, or body failed validation.  |
| `404`  | `order_not_found`               | Order was not found.                               |
| `404`  | `product_not_found`             | Product snapshot could not be read from Inventory. |
| `409`  | `invalid_order_status`          | Requested order transition is not allowed.         |
| `409`  | `order_currency_mismatch`       | Requested products do not share the same currency. |
| `502`  | `inventory_service_unavailable` | Inventory service could not be reached.            |
| `502`  | `inventory_request_failed`      | Inventory service returned a non-success response. |
| `500`  | `internal_error`                | Unexpected server error.                           |

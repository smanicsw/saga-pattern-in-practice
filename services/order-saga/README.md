# Order Saga Service

The Order Saga service is a worker-only orchestrator for the cross-service order workflow.

It does not expose an HTTP API. It consumes Kafka events from the Order, Inventory, and Payments outbox topics, records inbox processing state, calls participant service APIs, and tracks saga state in its own database.

## Responsibilities

- Consume order, inventory, and payment domain events from Kafka.
- Deduplicate consumed events through the `inbox_events` table.
- Track each order saga in the `order_sagas` table.
- Reserve inventory after an order is created.
- Authorize payment after inventory is reserved.
- Confirm inventory and then confirm the order after payment succeeds.
- Release inventory, refund payment, and cancel the order when compensation is required.
- Preserve correlation and causation metadata when issuing participant commands.

## Runtime Components

- Worker entrypoint: `src/orchestrator/worker.ts`
- Inbox manager: `src/inbox/inbox-event.manager.ts`
- Saga state helpers: `src/orchestrator/order-saga-state.ts`
- Event handlers: `src/orchestrator/handlers`
- Compensation helpers: `src/orchestrator/compensation.ts`
- HTTP adapters: `src/infrastructure/adapters/order`, `src/infrastructure/adapters/inventory`, `src/infrastructure/adapters/payments`
- Database: PostgreSQL
- Migrations: `src/infrastructure/adapters/database/migrations`
- Consumed topics: `outbox-events.order`, `outbox-events.inventory`, `outbox-events.payments`

## Commands

Run the worker locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_order_saga@localhost:5439/order_saga_db
export KAFKA_BROKERS=localhost:9092
export ORDER_SERVICE_BASE_URL=http://localhost:3001
export INVENTORY_SERVICE_BASE_URL=http://localhost:3003
export PAYMENTS_SERVICE_BASE_URL=http://localhost:3002
corepack pnpm --filter @saga/order-saga-service db:migrate:latest
corepack pnpm dev:order-saga
```

Run Order Saga tests:

```bash
corepack pnpm test:up -- order-saga
corepack pnpm test -- order-saga
corepack pnpm test:down -- order-saga
```

Run only Order Saga functional tests:

```bash
corepack pnpm test:functional -- order-saga
```

Run service checks:

```bash
corepack pnpm --filter @saga/order-saga-service typecheck
corepack pnpm --filter @saga/order-saga-service lint
corepack pnpm --filter @saga/order-saga-service build
```

## Environment

Required when running outside Docker:

- `DATABASE_URL`
- `KAFKA_BROKERS`
- `ORDER_SERVICE_BASE_URL`
- `INVENTORY_SERVICE_BASE_URL`
- `PAYMENTS_SERVICE_BASE_URL`

Optional:

- `KAFKA_ORDER_SAGA_GROUP_ID`, default `order-saga-orchestrator`

## Data Model

### `order_sagas`

- `id`
- `order_id`, unique
- `status`: `STARTED`, `RESERVATION_CREATED`, `PAYMENT_AUTHORIZED`, `RESERVATION_CONFIRMED`, `COMPLETED`, `COMPENSATING`, or `FAILED`
- `current_step`: `RESERVE_INVENTORY`, `AUTHORIZE_PAYMENT`, `CONFIRM_RESERVATION`, `CONFIRM_ORDER`, `COMPENSATE`, `COMPLETED`, or `FAILED`
- `reservation_id`, nullable
- `payment_id`, nullable
- `payment_method_token`, nullable
- `failure_reason`, nullable JSON
- `created_at`
- `updated_at`

### `inbox_events`

- event identity: `id`, `event_id`, `event_type`, `event_version`
- source: `source_service`, `topic`, `partition`, `message_offset`
- aggregate: `aggregate_type`, `aggregate_id`
- payload and headers: `payload`, `headers`
- processing state: `status`, `attempts`, `next_attempt_at`, `received_at`, `processed_at`, `dead_lettered_at`, `last_error`
- audit fields: `created_at`, `updated_at`

## Event Handling

| Event type                        | Handler action                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `order.order.created`             | Creates saga state and requests an Inventory reservation.                            |
| `inventory.reservation.created`   | Records the reservation and requests payment authorization.                          |
| `payments.payment.authorized`     | Records the payment and requests Inventory reservation confirmation.                 |
| `inventory.reservation.confirmed` | Confirms the order and marks the saga `COMPLETED`.                                   |
| `payments.payment.failed`         | Releases the reservation when present, cancels the order, and marks the saga failed. |
| `order.order.cancelled`           | Releases reservation and refunds payment when needed.                                |
| `order.order.confirmed`           | Ensures the reservation is confirmed when an order is manually confirmed.            |

The consumer subscribes with `fromBeginning: true`. Event replay is safe because `inbox_events.event_id` is unique and already processed events are skipped.

## Saga Flow

### Successful path

1. Order service creates a `PENDING` order and publishes `order.order.created`.
2. Order Saga creates an `order_sagas` row with `STARTED / RESERVE_INVENTORY`.
3. Order Saga calls `POST /api/v1/inventory/reservations`.
4. Inventory publishes `inventory.reservation.created`.
5. Order Saga records the reservation and calls `POST /api/v1/payments/authorize`.
6. Payments publishes `payments.payment.authorized`.
7. Order Saga records the payment and calls `POST /api/v1/inventory/reservations/:reservationId/confirm`.
8. Inventory publishes `inventory.reservation.confirmed`.
9. Order Saga calls `POST /api/v1/order/orders/:orderId/confirm`.
10. Order Saga marks the saga `COMPLETED / COMPLETED`.

### Compensation paths

Reservation failure:

1. Inventory reservation request is rejected, commonly by `stock_not_found` or `insufficient_stock`.
2. Order Saga cancels the order.
3. Order Saga marks the saga `FAILED / FAILED`.

Payment failure:

1. Payments publishes `payments.payment.failed`.
2. Order Saga releases the reservation if one exists.
3. Order Saga cancels the order if it is still pending.
4. Order Saga marks the saga `FAILED / FAILED`.

Failure after payment authorization:

1. Order Saga refunds the authorized payment.
2. Order Saga releases the reservation.
3. Order Saga cancels the order.
4. Order Saga marks the saga `FAILED / FAILED`.

Manual order cancellation:

1. Order service publishes `order.order.cancelled`.
2. Order Saga refunds payment when a payment exists.
3. Order Saga releases the reservation when a releasable reservation exists.
4. Order Saga marks the saga `FAILED / FAILED`.

## Idempotency And Retries

- Kafka event handling is inbox-backed by `event_id`.
- Already processed inbox events are skipped.
- Saga rows are unique by `order_id`.
- Reservation and payment identifiers are stored before later steps run so retries can continue from the known participant state.
- Participant APIs are called with `x-correlation-id` and `x-causation-id` derived from the consumed event.
- Handler failures leave the inbox event in `FAILED` with retry metadata and rethrow so Kafka can retry according to consumer behavior.

## Participant APIs Used

Order:

- `GET /api/v1/order/orders/:orderId`
- `POST /api/v1/order/orders/:orderId/confirm`
- `POST /api/v1/order/orders/:orderId/cancel`

Inventory:

- `POST /api/v1/inventory/reservations`
- `POST /api/v1/inventory/reservations/:reservationId/confirm`
- `POST /api/v1/inventory/reservations/:reservationId/release`

Payments:

- `POST /api/v1/payments/authorize`
- `POST /api/v1/payments/:paymentId/refund`

## No HTTP API

There are no routes, health endpoint, or response envelopes in this service. Use process logs, Kafka lag, and the `order_sagas` / `inbox_events` tables to inspect worker behavior.

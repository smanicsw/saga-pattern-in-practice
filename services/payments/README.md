# Payments Service

The Payments service owns payment authorization, refund state, and payment outbox events.

Base URL in local development:

```txt
http://localhost:3002/api/v1/payments
```

## Responsibilities

- Authorize one payment per order.
- Persist payment status, provider references, and failure details.
- Refund authorized payments.
- Provide read APIs for payments by payment ID or order ID.
- Persist outbox events transactionally with payment state changes.
- Publish pending outbox events from a separate worker process.

## Runtime Components

- API process: `src/index.ts`
- Express app: `src/app.ts`
- Outbox worker: `src/outbox/worker.ts`
- Database: PostgreSQL
- Migrations: `src/infrastructure/adapters/database/migrations`
- Fake payment provider: `src/infrastructure/adapters/payment-provider/fake-payment-provider.ts`
- Message publisher adapter: `src/infrastructure/adapters/message-broker/event-publisher.ts`
- Broker topic: `outbox-events.payments`

The current provider adapter is deterministic and local. It approves payments by default and declines known failure tokens so saga compensation paths can be tested without a real payment gateway.

## Commands

Run the API locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_payments@localhost:5434/payments_db
corepack pnpm --filter @saga/payments-service db:migrate:latest
corepack pnpm dev:payments
```

Run the outbox worker locally:

```bash
export DATABASE_URL=postgresql://postgres:change_me_payments@localhost:5434/payments_db
export KAFKA_BROKERS=localhost:9092
corepack pnpm --filter @saga/payments-service outbox:worker
```

Run Payments tests:

```bash
corepack pnpm test:up -- payments
corepack pnpm test -- payments
corepack pnpm test:down -- payments
```

Run only Payments functional tests:

```bash
corepack pnpm test:functional -- payments
```

Run service checks:

```bash
corepack pnpm --filter @saga/payments-service typecheck
corepack pnpm --filter @saga/payments-service lint
corepack pnpm --filter @saga/payments-service build
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

Both must be UUIDs when provided. They are stored in payment outbox event metadata and help trace saga commands across services.

## Data Model

### `payments`

- `id`
- `order_id`, unique
- `amount`
- `currency`
- `status`: `PENDING`, `AUTHORIZED`, `FAILED`, or `REFUNDED`
- `provider_ref`, nullable
- `failure_reason`, nullable JSON
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
    "service": "payments",
    "status": "ok"
  }
}
```

## Payments

### `POST /authorize`

Creates or reuses a payment for an order and runs authorization through the fake provider. A new payment is first persisted as `PENDING`, then finalized as `AUTHORIZED` or `FAILED`.

Request:

```json
{
  "orderId": "order-id",
  "amount": 99.98,
  "currency": "EUR",
  "paymentMethodToken": "tok_visa"
}
```

Rules:

- `orderId`: required UUID
- `amount`: required number, minimum `0.01`
- `currency`: required string, 3 chars
- `paymentMethodToken`: optional string, 1 to 255 chars

The fake provider declines these tokens:

- `card_declined`
- `fail`
- `failed`
- `insufficient_funds`

Response data:

```json
{
  "id": "payment-id",
  "orderId": "order-id",
  "amount": 99.98,
  "currency": "EUR",
  "status": "AUTHORIZED",
  "providerRef": "fake-auth-payment-id",
  "failureReason": null,
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z"
}
```

Outbox events for a new successful authorization:

- `payments.payment.authorization_requested`
- `payments.payment.authorized`

Outbox events for a new declined authorization:

- `payments.payment.authorization_requested`
- `payments.payment.failed`

Idempotency:

- one payment is allowed per `orderId`
- a compatible repeated request returns the existing payment
- a repeated request with a different amount or currency returns `409 payment_conflict`
- a request for an already refunded order returns `409 payment_conflict`

Errors:

- `409 payment_conflict`

### `POST /:paymentId/refund`

Refunds an authorized payment.

Request:

```json
{
  "reason": "ORDER_CANCELLED"
}
```

Rules:

- `reason`: optional string, 1 to 255 chars

Valid transition:

```txt
AUTHORIZED -> REFUNDED
```

This endpoint is idempotent once the payment is already `REFUNDED`; it returns the current refunded payment and does not create another outbox event.

Outbox event when the payment changes:

- `type`: `payments.payment.refunded`
- `action`: `update`
- `aggregate.type`: `payment`
- `payload.payment.previous.status`: `AUTHORIZED`
- `payload.payment.current.status`: `REFUNDED`

Errors:

- `404 payment_not_found`
- `409 invalid_payment_status`

### `GET /`

Lists payments with cursor pagination.

Query:

- `orderId`: optional UUID
- `status`: optional `PENDING`, `AUTHORIZED`, `FAILED`, or `REFUNDED`
- `limit`: optional integer, minimum `1`, default `20`; values above `100` are capped to `100`
- `cursor`: optional payment UUID

Example:

```txt
GET /?orderId=order-id&status=AUTHORIZED&limit=20&cursor=payment-id
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

### `GET /by-order/:orderId`

Returns one payment by order UUID.

Errors:

- `404 payment_not_found`

### `GET /:paymentId`

Returns one payment by payment UUID.

Errors:

- `404 payment_not_found`

## Idempotency Summary

| Endpoint                          | Idempotency behavior                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `POST /authorize`                 | Idempotent by unique `orderId` for compatible amount/currency input. |
| `POST /:paymentId/refund`         | Idempotent when already `REFUNDED`.                                  |
| `GET /`, `GET /by-order/:orderId` | Read-only; no outbox events.                                         |
| `GET /:paymentId`                 | Read-only; no outbox events.                                         |

## Outbox Events

Mutation endpoints create outbox events in the same database transaction as the payment change. No event is created for read endpoints or idempotent no-op returns.

Current event types:

- `payments.payment.authorization_requested`
- `payments.payment.authorized`
- `payments.payment.failed`
- `payments.payment.refunded`

Event envelope:

```json
{
  "id": "event-id",
  "type": "payments.payment.authorized",
  "version": 1,
  "action": "update",
  "service": "payments",
  "aggregate": {
    "type": "payment",
    "id": "payment-id"
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
- publishes to topic `outbox-events.payments`
- uses the aggregate ID as the message key
- marks successful events as `PUBLISHED`
- retries failures with exponential backoff capped at `60s`
- dead-letters an event after `10` failed publish attempts
- sleeps for `5s` when there are no pending events

## Error Codes

| Status | Error code               | Meaning                                           |
| ------ | ------------------------ | ------------------------------------------------- |
| `400`  | `invalid_request`        | Request params, query, or body failed validation. |
| `404`  | `payment_not_found`      | Payment was not found.                            |
| `409`  | `invalid_payment_status` | Requested payment transition is not allowed.      |
| `409`  | `payment_conflict`       | Request conflicts with an existing payment.       |
| `500`  | `internal_error`         | Unexpected server error.                          |

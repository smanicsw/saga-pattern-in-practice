# Saga Pattern in Practice

Learning-focused microservices project for orchestration-based sagas and the transactional outbox pattern.

The repository is a pnpm workspace with four backend services and a small Vite web app:

- `services/order`
- `services/order-saga`
- `services/payments`
- `services/inventory`
- `apps/web`

The Order, Payments, and Inventory services expose HTTP APIs and publish domain events through transactional outboxes. The Order Saga service is a Kafka-backed worker that consumes those events, stores inbox processing state, and coordinates the cross-service order workflow.

## Stack

- Node.js 22+
- TypeScript, ESM, `module: NodeNext`
- Express
- TypeBox validation
- pino logging
- PostgreSQL, one database per service
- Knex migrations and queries
- Kafka and kafkajs for service event delivery
- Jest and ts-jest
- Docker Compose for local infrastructure and containerized runtime
- pnpm workspaces managed by Corepack

## Prerequisites

- Node.js 22+
- Corepack enabled
- Docker and Docker Compose

Enable Corepack once if needed:

```bash
corepack enable
```

Install workspace dependencies from the repository root:

```bash
corepack pnpm install
```

## Environment

Copy the example env file before running Docker-based flows:

```bash
cp .env.example .env
```

Important variables:

- `ORDER_SERVICE_PORT`, `PAYMENT_SERVICE_PORT`, `INVENTORY_SERVICE_PORT`
- `ORDER_DATABASE_URL`, `ORDER_SAGA_DATABASE_URL`, `PAYMENT_DATABASE_URL`, `INVENTORY_DATABASE_URL`
- `ORDER_DB_HOST_PORT`, `ORDER_SAGA_DB_HOST_PORT`, `PAYMENTS_DB_HOST_PORT`, `INVENTORY_DB_HOST_PORT`
- `ORDER_TEST_DATABASE_URL`, `ORDER_SAGA_TEST_DATABASE_URL`, `PAYMENTS_TEST_DATABASE_URL`, `INVENTORY_TEST_DATABASE_URL`
- `ORDER_TEST_DB_HOST_PORT`, `ORDER_SAGA_TEST_DB_HOST_PORT`, `PAYMENTS_TEST_DB_HOST_PORT`, `INVENTORY_TEST_DB_HOST_PORT`

Docker Compose reads `.env` automatically. Local non-Docker commands do not load `.env` by themselves, so export the needed environment variables in your shell or use an env loader.

## Service Ports

| Service    | Default URL             | API prefix          |
| ---------- | ----------------------- | ------------------- |
| Order      | `http://localhost:3001` | `/api/v1/order`     |
| Payments   | `http://localhost:3002` | `/api/v1/payments`  |
| Inventory  | `http://localhost:3003` | `/api/v1/inventory` |
| Order Saga | No HTTP server          | n/a                 |

Health checks:

```bash
curl http://localhost:3001/api/v1/order/health
curl http://localhost:3002/api/v1/payments/health
curl http://localhost:3003/api/v1/inventory/health
```

## Run Everything With Docker

Build and start all services, databases, Kafka, API outbox workers, and the Order Saga worker:

```bash
corepack pnpm docker:up
```

Stop the stack:

```bash
corepack pnpm docker:down
```

Follow logs:

```bash
corepack pnpm docker:logs
```

In the normal Docker flow, each API service and the Order Saga worker wait for their database and run `knex migrate:latest` before starting the compiled process. Outbox workers publish API-service outbox rows to Kafka topics consumed by the Order Saga worker.

## Run Everything With Docker Hot Reload

Start all services in watch mode with source mounted into the containers:

```bash
corepack pnpm docker:dev
```

Stop the dev stack:

```bash
corepack pnpm docker:dev:down
```

Follow dev logs:

```bash
corepack pnpm docker:dev:logs
```

In dev mode, API service containers run migrations and then start with `tsx watch`. The Order, Payments, and Inventory outbox workers run as separate processes, and the Order Saga worker runs with `corepack pnpm --filter @saga/order-saga-service orchestrator:worker`.

## Run One Service Locally

Start the service's database first. For example, Inventory:

```bash
docker compose up -d inventory-db
```

Export a host-reachable `DATABASE_URL`, run migrations, and start the service:

```bash
export DATABASE_URL=postgresql://postgres:change_me_inventory@localhost:5435/inventory_db
corepack pnpm --filter @saga/inventory-service db:migrate:latest
corepack pnpm dev:inventory
```

Equivalent root scripts exist for each backend process:

```bash
corepack pnpm dev:order
corepack pnpm dev:order-saga
corepack pnpm dev:payments
corepack pnpm dev:inventory
```

When running locally, start one terminal per process. Each service expects its own `DATABASE_URL` to point to that service's database. Outbox workers and the Order Saga worker also need `KAFKA_BROKERS` to point at a reachable broker, such as `localhost:9092` when using the host-exposed Docker Kafka port.

## Build And Static Checks

From the repository root:

```bash
corepack pnpm build
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:check
```

Format files:

```bash
corepack pnpm format
```

## Database Migrations

Each stateful service has its own `knexfile.cjs` and migration directory:

- `services/order/src/infrastructure/adapters/database/migrations`
- `services/order-saga/src/infrastructure/adapters/database/migrations`
- `services/payments/src/infrastructure/adapters/database/migrations`
- `services/inventory/src/infrastructure/adapters/database/migrations`

Create a migration:

```bash
corepack pnpm --filter @saga/order-service db:migrate:make migration_name
corepack pnpm --filter @saga/order-saga-service db:migrate:make migration_name
corepack pnpm --filter @saga/payments-service db:migrate:make migration_name
corepack pnpm --filter @saga/inventory-service db:migrate:make migration_name
```

Apply migrations:

```bash
corepack pnpm --filter @saga/order-service db:migrate:latest
corepack pnpm --filter @saga/order-saga-service db:migrate:latest
corepack pnpm --filter @saga/payments-service db:migrate:latest
corepack pnpm --filter @saga/inventory-service db:migrate:latest
```

For local migration commands, make sure `DATABASE_URL` points to the correct service database.

## Testing

Start all test databases:

```bash
corepack pnpm test:up
```

Start one service test database:

```bash
corepack pnpm test:up -- inventory
corepack pnpm test:up -- order
corepack pnpm test:up -- order-saga
corepack pnpm test:up -- payments
```

Run all service tests:

```bash
corepack pnpm test
```

Run one service's tests:

```bash
corepack pnpm test -- inventory
corepack pnpm test -- order
corepack pnpm test -- order-saga
corepack pnpm test -- payments
```

Run only functional tests:

```bash
corepack pnpm test:functional
corepack pnpm test:functional -- inventory
corepack pnpm test:functional -- order-saga
```

Stop test databases:

```bash
corepack pnpm test:down
corepack pnpm test:down -- inventory
corepack pnpm test:down -- order-saga
```

The test runner starts host-side Jest processes and uses the test database URLs from `.env.example` defaults or your environment.

## Common Service Shape

API services follow the same broad structure:

```txt
src/index.ts                  process entrypoint
src/app.ts                    Express app wiring
src/routes                    route registration and schemas
src/managers                  business logic
src/repositories              database access
src/infrastructure/adapters   database, logger, and other adapters
src/constants                 service constants
tests                         unit, functional, API helpers, fixtures, utilities
```

Every API service:

- exposes routes under a service-specific `/api/v1/<service>` prefix
- validates request bodies, route params, query params, and responses with TypeBox
- wraps successful non-204 responses as `{ "success": true, "data": ... }`
- wraps errors as `{ "success": false, "error": "<code>" }`
- owns a separate PostgreSQL database
- runs migrations before startup in Docker flows
- handles graceful shutdown for `SIGINT`, `SIGTERM`, and unhandled startup failures

The Order Saga service is intentionally worker-only. It has no HTTP routes, but owns its `order_sagas` and `inbox_events` tables, consumes Kafka events from the API services, and calls service APIs to advance or compensate the saga.

## Additional Documentation

- [Order service README](services/order/README.md)
- [Order Saga service README](services/order-saga/README.md)
- [Payments service README](services/payments/README.md)
- [Inventory service README](services/inventory/README.md)
- [Saga goal and flows](docs/orchestration-saga-goal-and-flows.md)
- [Outbox implementation plan](docs/outbox-pattern-implementation-plan.md)
- [Backend development guidelines](docs/backend-development-guidelines.md)
- [Backend testing guidelines](docs/backend-testing-guidelines.md)

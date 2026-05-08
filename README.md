# Saga Pattern in Practice

Learning-focused microservices project for orchestration-based sagas and the transactional outbox pattern.

The repository is a pnpm workspace with three independent Node.js services:

- `services/order`
- `services/payments`
- `services/inventory`

Each service owns its own API process, database, migrations, and tests. The Inventory service currently has the most complete API surface; see [services/inventory/README.md](services/inventory/README.md) for service-specific details.

## Stack

- Node.js 22+
- TypeScript, ESM, `module: NodeNext`
- Express
- TypeBox validation
- pino logging
- PostgreSQL, one database per service
- Knex migrations and queries
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
- `ORDER_DATABASE_URL`, `PAYMENT_DATABASE_URL`, `INVENTORY_DATABASE_URL`
- `ORDER_DB_HOST_PORT`, `PAYMENTS_DB_HOST_PORT`, `INVENTORY_DB_HOST_PORT`
- `ORDER_TEST_DATABASE_URL`, `PAYMENTS_TEST_DATABASE_URL`, `INVENTORY_TEST_DATABASE_URL`
- `ORDER_TEST_DB_HOST_PORT`, `PAYMENTS_TEST_DB_HOST_PORT`, `INVENTORY_TEST_DB_HOST_PORT`

Docker Compose reads `.env` automatically. Local non-Docker commands do not load `.env` by themselves, so export the needed environment variables in your shell or use an env loader.

## Service Ports

| Service   | Default URL             | API prefix          |
| --------- | ----------------------- | ------------------- |
| Order     | `http://localhost:3001` | `/api/v1/order`     |
| Payments  | `http://localhost:3002` | `/api/v1/payments`  |
| Inventory | `http://localhost:3003` | `/api/v1/inventory` |

Health checks:

```bash
curl http://localhost:3001/api/v1/order/health
curl http://localhost:3002/api/v1/payments/health
curl http://localhost:3003/api/v1/inventory/health
```

## Run Everything With Docker

Build and start all services, databases, and the Inventory outbox worker:

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

In the normal Docker flow, each service container waits for its database and runs `knex migrate:latest` before starting the compiled service process.

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

In dev mode, service containers run migrations and then start with `tsx watch`. The Inventory outbox worker runs as a separate process with `corepack pnpm --filter @saga/inventory-service outbox:worker`.

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

Equivalent root scripts exist for each API service:

```bash
corepack pnpm dev:order
corepack pnpm dev:payments
corepack pnpm dev:inventory
```

When running locally, start one terminal per service. Each service expects its own `DATABASE_URL` to point to that service's database.

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

Each service has its own `knexfile.cjs` and migration directory:

- `services/order/src/infrastructure/adapters/database/migrations`
- `services/payments/src/infrastructure/adapters/database/migrations`
- `services/inventory/src/infrastructure/adapters/database/migrations`

Create a migration:

```bash
corepack pnpm --filter @saga/order-service db:migrate:make migration_name
corepack pnpm --filter @saga/payments-service db:migrate:make migration_name
corepack pnpm --filter @saga/inventory-service db:migrate:make migration_name
```

Apply migrations:

```bash
corepack pnpm --filter @saga/order-service db:migrate:latest
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
corepack pnpm test -- payments
```

Run only functional tests:

```bash
corepack pnpm test:functional
corepack pnpm test:functional -- inventory
```

Stop test databases:

```bash
corepack pnpm test:down
corepack pnpm test:down -- inventory
```

The test runner starts host-side Jest processes and uses the test database URLs from `.env.example` defaults or your environment.

## Common Service Shape

Each service follows the same broad structure:

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

Every service:

- exposes routes under a service-specific `/api/v1/<service>` prefix
- validates request bodies, route params, query params, and responses with TypeBox
- wraps successful non-204 responses as `{ "success": true, "data": ... }`
- wraps errors as `{ "success": false, "error": "<code>" }`
- owns a separate PostgreSQL database
- runs migrations before startup in Docker flows
- handles graceful shutdown for `SIGINT`, `SIGTERM`, and unhandled startup failures

## Additional Documentation

- [Inventory service README](services/inventory/README.md)
- [Saga goal and flows](docs/orchestration-saga-goal-and-flows.md)
- [Outbox implementation plan](docs/outbox-pattern-implementation-plan.md)
- [Backend development guidelines](docs/backend-development-guidelines.md)
- [Backend testing guidelines](docs/backend-testing-guidelines.md)

# Saga Pattern in Practice

Learning-focused microservices case study for orchestration-based sagas and the transactional outbox pattern.

## Overview

This repository is a pnpm workspace with three independent Node.js/TypeScript services:

- `order`
- `payments`
- `inventory`

Each service currently exposes:

- a health endpoint
- a simple overview endpoint

The codebase is organized so each service can evolve independently while still being run together during local development.

## Architecture

### High-level design

- **Runtime:** Node.js + Express
- **Language:** TypeScript (`module: NodeNext`, ESM)
- **Validation:** TypeBox
- **Logging:** pino + pino-http
- **Monorepo/workspace:** pnpm workspaces
- **Testing:** Jest + ts-jest (per service)
- **Containerization:** Docker multi-stage build + Docker Compose

### Service structure

Each service follows the same shape:

- `src/index.ts`: process entrypoint (startup + graceful shutdown)
- `src/app.ts`: Express app wiring (middleware + prefixed routes)
- `src/routes/`: route registration and schemas
- `src/managers/`: business logic layer
- `src/repositories/`: data access abstraction
- `src/infrastructure/adapters/`: adapters (logger, database)
- `src/constants/`: service constants (for example `SERVICE_API_PREFIX`)
- `src/tests/`: test folders (`unit`, `functional`, `apis`, `mocks`, `fixtures`, `utils`)

### Route prefixing

Every service mounts routes under a service-specific prefix:

- Order: `/api/v1/order`
- Payments: `/api/v1/payments`
- Inventory: `/api/v1/inventory`

So service route definitions like `router.get("/health", ...)` become `/api/v1/<service>/health` at runtime.

## Services and Endpoints

### Order service

- Base URL: `http://localhost:3001`
- Prefix: `/api/v1/order`
- Endpoints:
  - `GET /api/v1/order/health`
  - `GET /api/v1/order/`

### Payments service

- Base URL: `http://localhost:3002`
- Prefix: `/api/v1/payments`
- Endpoints:
  - `GET /api/v1/payments/health`
  - `GET /api/v1/payments/`

### Inventory service

- Base URL: `http://localhost:3003`
- Prefix: `/api/v1/inventory`
- Endpoints:
  - `GET /api/v1/inventory/health`
  - `GET /api/v1/inventory/`

## Prerequisites

- Node.js 22+
- Corepack enabled (`corepack enable`)
- pnpm (managed by Corepack)
- Docker + Docker Compose (optional, for containerized workflow)

## Install Dependencies

From repository root:

```bash
corepack pnpm install
```

## Run the App

### Option 1: Local development (one terminal per service)

```bash
corepack pnpm dev:order
corepack pnpm dev:payments
corepack pnpm dev:inventory
```

### Option 2: Run all services with Docker (single command)

```bash
corepack pnpm docker:up
```

Stop all containers:

```bash
corepack pnpm docker:down
```

View container logs:

```bash
corepack pnpm docker:logs
```

## Verify the App

Run quick health checks:

```bash
curl http://localhost:3001/api/v1/order/health
curl http://localhost:3002/api/v1/payments/health
curl http://localhost:3003/api/v1/inventory/health
```

Try overview endpoints:

```bash
curl http://localhost:3001/api/v1/order/
curl http://localhost:3002/api/v1/payments/
curl http://localhost:3003/api/v1/inventory/
```

## Build, Typecheck, Lint

From root:

```bash
corepack pnpm build
corepack pnpm typecheck
corepack pnpm lint
```

These run recursively across all services.

## Testing

### Run all tests

```bash
corepack pnpm -r test
```

### Run tests for one service

```bash
corepack pnpm --filter @saga/order-service test
corepack pnpm --filter @saga/payments-service test
corepack pnpm --filter @saga/inventory-service test
```

### Test folder layout per service

- `src/tests/unit`: unit tests
- `src/tests/functional`: functional tests
- `src/tests/apis`: endpoint/API tests
- `src/tests/mocks`: test doubles and mock adapters
- `src/tests/fixtures`: static test data
- `src/tests/utils`: test helper functions

## Docker Notes

- The Dockerfile uses a **multi-stage build**:
  - deps stage installs workspace dependencies
  - build stage compiles selected service and deploys production bundle
  - runtime stage contains only the deployed service output
- `docker-compose.yml` builds three images with build args:
  - `SERVICE=order`
  - `SERVICE=payments`
  - `SERVICE=inventory`

## Graceful Shutdown Behavior

Each service entrypoint handles:

- `SIGINT` (Ctrl+C)
- `SIGTERM` (container/platform stop)
- `unhandledRejection`

On shutdown, the service logs, stops accepting new connections, disconnects database adapter, and exits cleanly.

## Workspace Commands Reference

From root `package.json`:

- `corepack pnpm dev:order`
- `corepack pnpm dev:payments`
- `corepack pnpm dev:inventory`
- `corepack pnpm docker:up`
- `corepack pnpm docker:down`
- `corepack pnpm docker:logs`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm lint`

## Current Scope and Next Steps

Current implementation is intentionally minimal and designed as a foundation for:

- saga orchestration flows
- transactional outbox implementation
- service-to-service communication
- richer API contracts and persistence


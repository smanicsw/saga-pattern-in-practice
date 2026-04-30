# Saga Pattern in Practice

Learning-focused microservices case study for orchestration-based sagas and the transactional outbox pattern.

## First milestone

This repository currently starts with a minimal pnpm workspace and three simple HTTP services.

```bash
corepack pnpm install
corepack pnpm dev:order
corepack pnpm dev:payments
corepack pnpm dev:inventory
```

The services listen on:

- Order: `http://localhost:3001`
- Payments: `http://localhost:3002`
- Inventory: `http://localhost:3003`

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

# Stage 1: Install workspace dependencies for building.
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services ./services

RUN pnpm install --frozen-lockfile

# Stage 2: Build only the selected service.
FROM deps AS build

ARG SERVICE
RUN pnpm --filter @saga/${SERVICE}-service build
RUN pnpm --filter @saga/${SERVICE}-service deploy --legacy --prod /out

# Stage 3: Runtime image containing only the selected service bundle.
FROM node:22-alpine AS runtime

ARG SERVICE
ENV NODE_ENV=production
ENV SERVICE=${SERVICE}
WORKDIR /app

# Copy only the deployed service output (prod deps + package files).
COPY --from=build /out ./

CMD ["node", "dist/index.js"]

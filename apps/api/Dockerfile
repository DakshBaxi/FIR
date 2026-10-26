# Build context: repository root (see docker-compose.yml)
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @fir/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @fir/shared build \
  && pnpm --filter @fir/api db:generate \
  && pnpm --filter @fir/api build

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/backend/core/package.json ./packages/backend/core/
COPY packages/backend/ddd/package.json ./packages/backend/ddd/
COPY packages/backend/cache/package.json ./packages/backend/cache/
COPY packages/backend/email/package.json ./packages/backend/email/
COPY packages/backend/queue/package.json ./packages/backend/queue/
COPY packages/backend/storage/package.json ./packages/backend/storage/
RUN pnpm install --frozen-lockfile --filter @flama/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @flama/api... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main"]

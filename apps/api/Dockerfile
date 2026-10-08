FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# The lockfile and every manifest the API's graph needs, and nothing else, so
# both installs below are cached until one of them changes.
FROM base AS manifests
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/env/package.json ./packages/env/
COPY packages/translations/package.json ./packages/translations/
COPY packages/backend/authz/package.json ./packages/backend/authz/
COPY packages/backend/core/package.json ./packages/backend/core/
COPY packages/backend/ddd/package.json ./packages/backend/ddd/
COPY packages/backend/cache/package.json ./packages/backend/cache/
COPY packages/backend/email/package.json ./packages/backend/email/
COPY packages/backend/i18n/package.json ./packages/backend/i18n/
COPY packages/backend/queue/package.json ./packages/backend/queue/
COPY packages/backend/storage/package.json ./packages/backend/storage/

# Everything the build needs, devDependencies included.
FROM manifests AS deps
RUN pnpm install --frozen-lockfile --filter @flama/api...

# What the process needs at runtime. The build needs every devDependency of
# the API's graph and of the workspace root — TypeScript, Vitest, SWC,
# Testcontainers, the Nest CLI, Biome, Turbo, Playwright — and shipping that
# tree put a test runner and a browser driver on the API's resolution path.
#
# Why not `pnpm deploy --prod`: under pnpm 9 it resolves the graph afresh
# instead of from the lockfile (it picked @better-auth/expo 1.7.6 over the
# locked 1.6.25), so the image would not run what CI tested. Why not one
# `--prod` install after the build: see the runner stage.
FROM manifests AS prod-deps
RUN pnpm install --prod --frozen-lockfile --filter @flama/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @flama/api... build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# pnpm links dependencies with **relative** symlinks whose depth encodes the
# workspace layout: `apps/api/node_modules/@flama/env` points at
# `../../../../packages/env`, and every third-party package points into
# `../../node_modules/.pnpm/…`. Flattening `apps/api/node_modules` onto
# `/app/node_modules` would make them dangle, so keep the depth the links were
# written for and run from the app directory.
#
# node_modules come from `prod-deps`; the built packages from `builder`, with
# `prod-deps`' package-level node_modules laid over theirs. The overlay is
# load-bearing: `@flama/backend-core` requires `rxjs` at runtime but declares
# it as a devDependency, so a production install alone does not link it there,
# and only the builder's link (into the `rxjs` the API itself depends on)
# resolves it. Declaring it as a dependency would let one `--prod` install
# after the build replace all three copies. Links left to devDependencies the
# production store lacks dangle, and are removed.
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=prod-deps --chown=nestjs:nodejs /app/packages ./packages
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
RUN find /app -type l ! -exec test -e {} \; -delete

# The layout above is the test: the image does not build unless the API's
# whole module graph resolves from it (every @flama package, `rxjs` through
# the overlay, the translations JSON), and no build or test tool does. Vitest
# and Playwright still sit in the store as optional peers of better-auth,
# which the lockfile resolves from the workspace; only better-auth's own peer
# links point at them, and the API cannot resolve them.
WORKDIR /app/apps/api
RUN node -e "require('@flama/env'); require('./dist/app.module'); \
  for (const m of ['vitest', '@playwright/test', 'playwright', 'typescript', '@nestjs/cli']) { \
    try { require.resolve(m); } catch { continue; } \
    console.error(m + ' is resolvable from the API image'); process.exit(1); \
  } \
  process.exit(0);"

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main"]

---
"@flama/api": patch
---

The production stack forwards the root `.env` to the API, and the API image ships production dependencies only.

- `docker/docker-compose.prod.yml` loads the root `.env` into the `api` service (`env_file`) instead of a hand-kept list of variables to forward, which had drifted (email delivery, S3, `TRUST_PROXY` could not be set). `environment:` keeps only the compose-network hosts and the shared database credentials. The API has a healthcheck on `/api/v1/health` and `web` waits for it.
- `pnpm docker:prod` passes `--env-file .env`, so Compose interpolates from the root file rather than a `docker/.env`; `pnpm docker:prod:down` stops the stack.
- The dev compose file has its own project name, so dev and prod stacks started from one checkout no longer share containers and volumes.
- `apps/api/Dockerfile` takes its runtime `node_modules` from a fresh `--prod` install instead of the build's full dev tree.

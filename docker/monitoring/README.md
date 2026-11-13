# Monitoring

The API's Prometheus alert rules and Grafana dashboard, kept here as the
source of truth, and the local stack that runs them: `pnpm monitoring:up`
starts a Prometheus, a Loki with Grafana Alloy shipping the API's log file to
it, and a Grafana over both, for the API that `pnpm dev` runs on the host.

| File | What it is |
|---|---|
| `rules/api.rules.yaml` | Alerts: availability, 5xx and latency by route, client aborts, event-loop lag and heap, cache reads failing |
| `grafana/dashboards/api.json` | The dashboard: traffic, latency, process, the Redis cache's hit rate by namespace, and log lines by level with the latest errors (Loki). Provisioned by the local Grafana; elsewhere, import it and pick the Prometheus and Loki data sources |
| `grafana/datasources/`, `grafana/providers/` | Grafana provisioning: Prometheus as the default data source (`DS_PROMETHEUS`), Loki (`DS_LOKI`), and a file provider over `grafana/dashboards/` |
| `prometheus.yml` | The API's scrape job and the rule files |
| `loki/loki.yaml` | Loki: one process, filesystem storage, 7 days of retention, structured metadata on |
| `alloy/config.alloy` | Grafana Alloy: tails the repository's `.logs/*.log`, labels each line `app` (the file's name) and `level`, keeps the correlation id and the logger's context as structured metadata |

The API exports `http_requests_total{route,status_class}`,
`http_request_duration_seconds{route}`,
`cache_reads_total{namespace,operation,result}` and the Node process
metrics, every series labelled `app="api"`, at `GET /api/v1/metrics` (HTTP
Basic auth, the token as password) while `METRICS_TOKEN` is set.

**`cache_reads_total` is the Redis cache** (`@flama/backend-cache`), one
count per read through `CacheService.get`. `result` is `hit`, `miss` or
`error`; the hit rate is `hit / (hit + miss + error)`. `namespace` is a key's
first `:`-separated segment (`user` for `user:profile:42`), never the key;
past twenty of them, or for one that is not a short identifier, it is
`other`. The twenty are the first a process reads, so with more than twenty
in use which ones get a label can change from one restart to the next. Each
namespace's results start at zero when it first gets a label, so one that
only ever misses reads 0%, not no data. The counting is
`apps/api/src/cache/infrastructure/cache-metrics.adapter.ts`, handed to the
cache as its `onRead`.

## Running it locally

1. Set `METRICS_TOKEN` in the root `.env` or `.env.local` (`openssl rand -hex
   32`) and, for the logs, `LOG_FILE=.logs/api.log`, then restart the API;
   without the token `/api/v1/metrics` is a 404, without the file Loki gets
   nothing.
2. `pnpm monitoring:up`, then `http://localhost:3030`: Grafana opens on the
   API dashboard, signed in as an admin with no login (it listens on
   loopback only). Prometheus is `http://localhost:9090`: Status, Targets
   shows `flama-api` up, Alerts shows the rules. Loki is
   `http://localhost:3100`, read with `pnpm logs` (below) or Grafana's
   Explore.
3. After editing a rule, `curl -X POST localhost:9090/-/reload` re-reads it
   (an edit to `prometheus.yml` needs `pnpm monitoring:down` and `up`). An
   edit to the dashboard's JSON shows in Grafana within 10 seconds; the
   provisioned dashboard refuses saving from the UI, so change the file.
   `pnpm monitoring:down` stops them all; `docker compose -f
   docker/docker-compose.monitoring.yml down -v` also drops the 7 days of
   metrics and logs and Grafana's own state. The API's `.logs/api.log` is
   never rotated: delete it to reclaim the space (Alloy picks the new one
   up).

The scripts (`scripts/monitoring/compose.mjs`) read `.env` and `.env.local`
the way the API does, so Prometheus gets the same `METRICS_TOKEN` (a compose
secret) and scrapes `host.docker.internal:$PORT`. With `METRICS_TOKEN` empty
the container refuses to start and says why. They also create `.logs/`
before `up`, so the directory Alloy mounts is yours and the API can write in
it.

## Logs

The API logs JSON lines through pino: every request's completion and every
`Logger` call, with the request's correlation id (`req.id`, also the
`x-correlation-id` response header and the problem document's), and never a
header, a query string or a body (`buildPinoHttpOptions` in
`@flama/backend-core`). They go to stdout, pretty-printed in development.

`LOG_FILE` also writes them, as JSON, to a file a shipper tails; a relative
path is taken from the repository root. Locally, Alloy ships every
`.logs/*.log` to Loki, so set `LOG_FILE=.logs/api.log` and restart the API.
Each line is labelled `app` (the file's name) and `level` (`info`, `warn`,
`error`, …); the correlation id (`req_id`) and the logger's `context` (the
class that logged) are structured metadata, filterable without being labels.

```bash
pnpm logs                                              # the last 15 minutes
pnpm logs '{app="api", level=~"error|fatal"}' --since 1h
pnpm logs '{app="api"} | req_id="<x-correlation-id>"'  # one request, every line
pnpm logs '{app="api"} | context="TypeORM"' --raw | jq .
```

`pnpm logs` (`scripts/monitoring/logs.mjs`) is how a person or an agent reads
them from a terminal: LogQL in, the lines as the API wrote them out (JSON
when piped, readable on a terminal). Grafana's Explore, Loki, is the same
store, and the API dashboard's Logs row has the lines by level and the latest
errors and warnings. An agent that speaks MCP can also query both stores
through Grafana's own MCP server (`mcp-grafana`) pointed at
`http://localhost:3030`.

## Keeping them honest

`apps/api/src/__tests__/monitoring-config.spec.ts` parses the rules and the
dashboard and fails when an expression names a metric the API does not
export (Loki panels, which name streams, are skipped), so a renamed metric
cannot leave an alert that never fires. It does not evaluate PromQL. A module
that adds its own metrics (`createMetricsProvider`) adds its rules and panels
here. The Loki
and Alloy configs have no check in CI either; Alloy's formatter parses one,
which catches a syntax error:

```bash
docker run --rm -v "$PWD/docker/monitoring/alloy:/etc/alloy:ro" \
  grafana/alloy:v1.10.2 fmt /etc/alloy/config.alloy
```

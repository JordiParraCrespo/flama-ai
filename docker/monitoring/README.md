# Monitoring

The API's Prometheus alert rules and Grafana dashboard, kept here as the
source of truth, and the local stack that runs them: `pnpm monitoring:up`
starts a Prometheus and a Grafana over the API that `pnpm dev` runs on the
host.

| File | What it is |
|---|---|
| `rules/api.rules.yaml` | Alerts: availability, 5xx and latency by route, client aborts, event-loop lag and heap |
| `grafana/dashboards/api.json` | The dashboard: traffic, latency, process. Provisioned by the local Grafana; elsewhere, import it and pick the Prometheus data source |
| `grafana/datasources/`, `grafana/providers/` | Grafana provisioning: Prometheus as the default data source, and a file provider over `grafana/dashboards/` |
| `prometheus.yml` | The API's scrape job and the rule files |

The API exports `http_requests_total{route,status_class}`,
`http_request_duration_seconds{route}` and the Node process metrics, every
series labelled `app="api"`, at `GET /api/v1/metrics` (HTTP Basic auth, the
token as password) while `METRICS_TOKEN` is set.

## Running it locally

1. Set `METRICS_TOKEN` in the root `.env` or `.env.local` (`openssl rand -hex
   32`) and restart the API; without it `/api/v1/metrics` is a 404.
2. `pnpm monitoring:up`, then `http://localhost:3030`: Grafana opens on the
   API dashboard, signed in as an admin with no login (it listens on
   loopback only). Prometheus is `http://localhost:9090`: Status, Targets
   shows `flama-api` up, Alerts shows the rules.
3. After editing a rule, `curl -X POST localhost:9090/-/reload` re-reads it
   (an edit to `prometheus.yml` needs `pnpm monitoring:down` and `up`). An
   edit to the dashboard's JSON shows in Grafana within 10 seconds; the
   provisioned dashboard refuses saving from the UI, so change the file.
   `pnpm monitoring:down` stops both; `docker compose -f
   docker/docker-compose.monitoring.yml down -v` also drops the 7 days of
   metrics and Grafana's own state.

The scripts (`scripts/monitoring/compose.mjs`) read `.env` and `.env.local`
the way the API does, so Prometheus gets the same `METRICS_TOKEN` (a compose
secret) and scrapes `host.docker.internal:$PORT`. With `METRICS_TOKEN` empty
the container refuses to start and says why.

## Keeping them honest

`apps/api/src/__tests__/monitoring-config.spec.ts` parses the rules and the
dashboard and fails when an expression names a metric the API does not
export, so a renamed metric cannot leave an alert that never fires. It does
not evaluate PromQL. A module that adds its own metrics
(`createMetricsProvider`) adds its rules and panels here.

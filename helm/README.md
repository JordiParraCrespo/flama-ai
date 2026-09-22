# Tier 2: Production Deployment (~€15-35/mo)

For production applications with Kubernetes on Hetzner.

## Architecture

Everything runs as Docker containers in a Hetzner Kubernetes cluster, deployed via Helm charts.

## Setup

### 1. Create a Hetzner K8s Cluster

Use Hetzner Cloud Console or `hcloud` CLI to create a cluster.

### 2. Install Helm Charts

```bash
# Add the Flama Helm chart
helm install flama ./helm/flama \
  --set api.image=ghcr.io/your-org/flama-api:latest \
  --set web.image=ghcr.io/your-org/flama-web:latest \
  --set runner.image=ghcr.io/your-org/flama-runner:latest
```

The chart ships what the starter ships: the API, the consumer web app, the
runner, Postgres and Redis. `pnpm plugin:add admin-web` and
`pnpm plugin:add docs` add their deployments, values and ingress rules back,
and then `adminWeb.image` and `docs.image` are settable too.

### 3. Configure Ingress

The chart includes ingress resources for every service it deploys. Configure
each hostname under `ingress.hosts`, set the API's `FRONTEND_URL` and
`BETTER_AUTH_URL` values to match, then point their DNS records to the
cluster's load balancer.

## Scaling

Scale individual services independently:

```bash
kubectl scale deployment flama-api --replicas=3
```

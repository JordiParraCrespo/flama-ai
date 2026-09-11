---
sidebar_position: 2
---

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
  --set adminWeb.image=ghcr.io/your-org/flama-admin-web:latest \
  --set docs.image=ghcr.io/your-org/flama-docs:latest
```

### 3. Configure Ingress

The Helm chart includes ingress resources for the API, consumer web app, admin
web app, and docs. Configure each hostname under `ingress.hosts`, set the API's
`FRONTEND_URL`, `ADMIN_FRONTEND_URL`, and `BETTER_AUTH_URL` values to match,
then point their DNS records to the cluster's load balancer.

## Scaling

Scale individual services independently:

```bash
kubectl scale deployment flama-api --replicas=3
```

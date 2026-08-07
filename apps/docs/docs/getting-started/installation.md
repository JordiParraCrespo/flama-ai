---
sidebar_position: 1
---

# Installation

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker and Docker Compose

## Quick start

```bash
# Clone the repo
git clone https://github.com/your-org/flama.git
cd flama

# Install dependencies
pnpm install

# Start infrastructure (Postgres + Redis)
pnpm docker:dev

# Copy the environment file (one .env at the repo root serves every app)
cp .env.example .env

# Start all apps in dev mode
pnpm dev
```

## Services

| App                | URL                            |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:3001          |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Docs               | http://localhost:3002          |

---
sidebar_position: 2
---

# CLI

`flama` administers a deployment from the terminal, and mints the scoped
credentials everything else uses.

```bash
pnpm --filter @flama/cli build
node apps/cli/dist/bin/flama.js --help
```

## Signing in

```bash
flama login
```

Signs in with email and password, then immediately trades that session for a
scoped API token and stores **only the token**. The session never touches disk,
so what sits in your config is narrower than a login and revocable on its own.

```bash
flama login --permissions users:read,roles:read   # narrower still
flama login --with-token flama_pat_…              # use a token you already have
flama logout                                      # revokes it server-side
```

Config lives in `~/.config/flama/config.json` with mode `0600`
(`FLAMA_CONFIG` overrides the path). Profiles let one machine talk to several
deployments:

```bash
flama --profile staging login
flama --profile staging users list
```

## Commands

| Command                                                                     | What it does                                |
| --------------------------------------------------------------------------- | ------------------------------------------- |
| `flama whoami`                                                              | The credential, and what it can actually do |
| `flama users list \| get \| update \| delete`                               | The user directory                          |
| `flama roles list \| get \| create \| set-permissions \| delete \| assign`  | Roles and their permission rules            |
| `flama orgs list \| create \| delete \| members \| invite \| remove-member` | Organizations and membership                |
| `flama workspaces list \| create \| delete`                                 | Workspaces                                  |
| `flama tokens list \| create \| revoke \| permissions`                      | Scoped API tokens                           |
| `flama mcp install \| status`                                               | Connect an agent to this deployment         |

Add `--json` to any command for a machine-readable payload.

## Managing tokens

`flama tokens permissions` prints the catalog and marks what you may grant:

```
✓  users:read     Users — Read           List and read user records.
✓  users:write    Users — Edit           Update and delete user records.
·  admin:write    User administration    Ban, unban, impersonate, set passwords…
```

```bash
flama tokens create --name "CI" --permissions users:read \
  --expires-in 90 --allow-ip 203.0.113.0/24
```

The secret is printed once. Store it then, or mint another.

## Exit codes

Scripts can branch on the outcome:

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| 0    | Success                                   |
| 1    | Failure                                   |
| 2    | Bad usage (unknown command, missing flag) |
| 3    | Not authenticated                         |
| 4    | Authenticated but not permitted           |
| 5    | Not found                                 |
| 6    | API unreachable                           |

```bash
flama users get "$id" --json > user.json || case $? in
  4) echo "token is missing users:read" ;;
  5) echo "no such user" ;;
esac
```

## Environment

| Variable          | Meaning                                 |
| ----------------- | --------------------------------------- |
| `FLAMA_API_URL`   | Default API base URL                    |
| `FLAMA_API_TOKEN` | Credential to use, ahead of the profile |
| `FLAMA_PROFILE`   | Profile to use                          |
| `FLAMA_CONFIG`    | Path to the config file                 |
| `NO_COLOR`        | Disable colour output                   |

# @flama/admin-web

The browser control plane for Flama. It is restricted to Better Auth `admin`
and `superadmin` accounts and currently manages users, application roles, and
permission grants.

```bash
pnpm --filter @flama/admin-web dev
```

Development runs on `http://localhost:3003`. Set `ADMIN_FRONTEND_URL` to its
public origin in deployed environments.

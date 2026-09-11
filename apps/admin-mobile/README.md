# @flama/admin-mobile

The native Flama control plane. It shares the user and role services with the
web control plane and is restricted to Better Auth `admin` and `superadmin`
accounts.

```bash
pnpm --filter @flama/admin-mobile dev
```

The deep-link scheme comes from `ADMIN_MOBILE_SCHEME` and defaults to
`flama-admin`.

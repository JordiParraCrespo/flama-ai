# @flama/admin-mobile

The native Flama control plane. It shares the user and role services with the
web control plane and is restricted to Better Auth `admin` and `superadmin`
accounts.

```bash
pnpm --filter @flama/admin-mobile dev
```

The deep-link scheme comes from `EXPO_PUBLIC_ADMIN_MOBILE_SCHEME` (with
`ADMIN_MOBILE_SCHEME` as the API-side fallback) and defaults to `flama-admin`.
The control plane has no registration route: accounts must already exist, and
social sign-in never requests implicit account creation.

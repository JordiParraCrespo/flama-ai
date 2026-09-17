/** Architecture fitness rules — see ARCHITECTURE.md. Run with: pnpm --filter @flama/admin-web arch */
module.exports = require('@flama/tsconfig/depcruise/frontend-app.cjs')({
  product: 'admin',
  platform: 'web',
  routes: 'src/routes',
  features: 'src/features',
});

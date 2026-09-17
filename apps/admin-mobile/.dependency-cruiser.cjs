/** Architecture fitness rules — see ARCHITECTURE.md. Run with: pnpm --filter @flama/admin-mobile arch */
module.exports = require('@flama/config/depcruise/frontend-app.cjs')({
  product: 'admin',
  platform: 'mobile',
  routes: 'app',
  features: 'features',
});

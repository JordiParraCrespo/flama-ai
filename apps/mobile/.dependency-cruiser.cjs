/** Architecture fitness rules — see ARCHITECTURE.md. Run with: pnpm --filter @flama/mobile arch */
module.exports = require('@flama/tsconfig/depcruise/frontend-app.cjs')({
  product: 'consumer',
  platform: 'mobile',
  routes: 'app',
  features: 'features',
});

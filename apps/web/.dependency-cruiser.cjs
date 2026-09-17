/** Architecture fitness rules — see ARCHITECTURE.md. Run with: pnpm --filter @flama/web arch */
module.exports = require('@flama/tsconfig/depcruise/frontend-app.cjs')({
  product: 'consumer',
  platform: 'web',
  routes: 'src/routes',
  features: 'src/features',
});

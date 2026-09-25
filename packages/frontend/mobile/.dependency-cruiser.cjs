/** Architecture fitness rules — see packages/frontend/mobile/ARCHITECTURE.md. Run with: pnpm --filter @flama/frontend-mobile arch */
module.exports = require('@flama/tsconfig/depcruise/frontend-kit.cjs')({
  leaves: ['platform', 'theme', 'analytics', 'forms'],
  middle: ['config', 'i18n', 'layout'],
  top: ['auth'],
});

/** Architecture fitness rules — see packages/frontend/ARCHITECTURE.md. Run with: pnpm --filter @flama/frontend-consumer arch */
module.exports = require('@flama/tsconfig/depcruise/frontend-domain.cjs')({ role: 'consumer' });

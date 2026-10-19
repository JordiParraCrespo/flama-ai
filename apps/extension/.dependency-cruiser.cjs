/**
 * Architecture fitness rules — see ARCHITECTURE.md. Run with: pnpm --filter @flama/extension arch
 *
 * The app rules every frontend app shares, with `src/entrypoints` as the
 * routes (each page composes), plus the extension's own: Chrome runs this code
 * in contexts that cannot reach each other's memory and do not have the same
 * APIs, so the directories that hold each context are import boundaries.
 */
const base = require('@flama/tsconfig/depcruise/frontend-app.cjs')({
  product: 'consumer',
  platform: 'web',
  routes: 'src/entrypoints',
  features: 'src/features',
});

const REACT = ['node_modules/react/', 'node_modules/react-dom/'];

module.exports = {
  ...base,
  forbidden: [
    ...base.forbidden,
    {
      name: 'runtime-is-the-floor',
      comment:
        'src/runtime/ is the only code that touches chrome.*, and everything else builds on it. It renders nothing and knows no page, worker or script above it.',
      severity: 'error',
      from: { path: '^src/runtime/' },
      to: {
        path: ['^src/(background|content|entrypoints|features|lib|providers)/', ...REACT],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'worker-holds-no-pages',
      comment:
        'The service worker has no DOM and runs no React. It builds on the runtime alone; a page, a feature or the kernel in its bundle would be code that cannot run there.',
      severity: 'error',
      from: { path: '^src/background/' },
      to: {
        path: [
          '^src/(content|entrypoints|features|lib|providers)/',
          'packages/frontend/',
          ...REACT,
        ],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'content-script-stays-small',
      comment:
        "The content script is injected into somebody else's page: the runtime and its own modules, nothing heavier.",
      severity: 'error',
      from: { path: '^src/content/' },
      to: {
        path: [
          '^src/(background|entrypoints|features|lib|providers)/',
          'packages/frontend/',
          ...REACT,
        ],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'pages-ask-the-worker',
      comment:
        "A page never imports the worker's or the content script's modules: it asks them, through the protocol in src/runtime/protocol.ts.",
      severity: 'error',
      from: { path: '^src/(entrypoints|features|lib|providers)/' },
      to: { path: '^src/(background|content)/', dependencyTypesNot: ['type-only'] },
    },
  ],
};

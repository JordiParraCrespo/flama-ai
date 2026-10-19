import { readFileSync } from 'node:fs';
import path from 'node:path';
import { locales } from '@flama/translations/locales';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { defineManifest } from './manifest.config.ts';
import pkg from './package.json' with { type: 'json' };

/**
 * One config, three bundles, because Chrome runs this extension in three kinds
 * of context and each wants a different file:
 *
 * - `pages` — the popup, the side panel and the options page: ordinary ES
 *   modules sharing chunks, React and the design system.
 * - `background` — the service worker. One ES module with every import inlined:
 *   a worker may not `import()` at all, and a chunk shared with the pages
 *   would carry their DOM assumptions into a context that has no DOM.
 * - `content` — the content script, injected into a page only when the person
 *   asks. A classic script (`iife`), because `scripting.executeScript` runs
 *   files, not modules, and small, because it is paid for on every page it
 *   touches.
 *
 * `scripts/build.mjs` runs the three in order (`EXTENSION_TARGET`), and writes
 * them into one `dist/` that is the unpacked extension.
 */
type Target = 'pages' | 'background' | 'content';
const target = (process.env.EXTENSION_TARGET ?? 'pages') as Target;

const root = path.resolve(import.meta.dirname, '../..');

/**
 * `manifest.json` and `_locales/`, emitted with the pages.
 *
 * `_locales` holds what Chrome itself shows (the store listing, the toolbar
 * title, the context menu, the shortcut list) and what the two scripts outside
 * React say. Both are read from `@flama/translations` (`extension.chrome`), so
 * the copy has one home and one review, like every other string in the repo.
 */
function extensionManifest(env: Record<string, string>): Plugin {
  return {
    name: 'flama:extension-manifest',
    generateBundle() {
      const manifest = defineManifest({
        version: pkg.version,
        apiUrl: env.EXTENSION_PUBLIC_API_URL || 'http://localhost:3001',
        publicKey: env.EXTENSION_PUBLIC_KEY || undefined,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });

      for (const locale of locales) {
        // The area file, read from disk: the config is loaded by Node, which
        // the package's TypeScript barrel (directory imports) is not written for.
        const area = JSON.parse(
          readFileSync(path.join(root, 'packages/translations', locale, 'extension.json'), 'utf8'),
        ) as { chrome: Record<string, string> };
        const entries = Object.entries(area.chrome).map(([key, message]) => [key, { message }]);
        this.emitFile({
          type: 'asset',
          fileName: `_locales/${locale}/messages.json`,
          source: `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
        });
      }
    },
  };
}

const scripts: Record<Exclude<Target, 'pages'>, { entry: string; format: 'es' | 'iife' }> = {
  background: { entry: 'src/background/index.ts', format: 'es' },
  content: { entry: 'src/content/index.ts', format: 'iife' },
};

export default defineConfig(({ mode }) => {
  // There is one .env, at the monorepo root. Only EXTENSION_PUBLIC_* reaches
  // the bundle: a prefix of its own, so a VITE_* meant for the web app never
  // ships inside an extension package that anyone can unzip.
  const env = loadEnv(mode, root, 'EXTENSION_PUBLIC_');

  const shared = {
    envDir: root,
    envPrefix: 'EXTENSION_PUBLIC_',
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
      // One i18next for the whole page — see apps/web/vite.config.ts.
      dedupe: ['i18next', 'react-i18next'],
    },
  };

  if (target !== 'pages') {
    const { entry, format } = scripts[target];
    return {
      ...shared,
      // Static assets belong to the pages build; copying them twice more would
      // only race it.
      publicDir: false,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        target: 'chrome116',
        minify: mode === 'production',
        sourcemap: mode !== 'production',
        lib: {
          entry: path.resolve(import.meta.dirname, entry),
          formats: [format],
          name: `flama_${target}`,
          fileName: () => `${target}.js`,
        },
        rolldownOptions: { output: { codeSplitting: false } },
      },
    };
  }

  return {
    ...shared,
    plugins: [
      react({
        // The React Compiler, as in every app: no `useMemo`, `useCallback` or
        // `memo` by hand. See .agents/rules/frontend-architecture.md.
        compiler: true,
      }),
      tailwindcss(),
      extensionManifest(env),
    ],
    optimizeDeps: {
      include: ['@flama/shared/schemas/auth'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'chrome116',
      sourcemap: mode !== 'production',
      // Extension pages load from disk; there is no network to preload over,
      // and the polyfill is an inline-script-shaped thing the CSP forbids.
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: {
          popup: path.resolve(import.meta.dirname, 'popup.html'),
          sidepanel: path.resolve(import.meta.dirname, 'sidepanel.html'),
          options: path.resolve(import.meta.dirname, 'options.html'),
        },
      },
      commonjsOptions: {
        // `@flama/shared` builds to CommonJS for the API's sake — see
        // apps/web/vite.config.ts.
        include: [/node_modules/, /packages[\\/]shared[\\/]dist/],
      },
    },
  };
});

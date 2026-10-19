#!/usr/bin/env node
/**
 * Builds the unpacked extension into `dist/`.
 *
 *   node scripts/build.mjs           # production: minified, no source maps
 *   node scripts/build.mjs --watch   # development: rebuild on save, reload Chrome
 *
 * Three Vite builds into one folder, in this order: the pages (which empties
 * `dist/` and writes `manifest.json`), the service worker, the content script.
 * Why three is the header of `vite.config.ts`.
 *
 * With `--watch` it also runs the reload server (`reload-server.mjs`): every
 * rebuild tells the development build's service worker, which reloads the
 * extension. Load `dist/` once from chrome://extensions ("Load unpacked") and
 * leave it; there is nothing to click after that.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { RELOAD_PORT, startReloadServer } from './reload-server.mjs';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['pages', 'background', 'content'];

const watch = process.argv.includes('--watch');
const mode = watch ? 'development' : 'production';

const reload = watch ? startReloadServer() : null;

/** One Vite build of one target, resolved when its first bundle is written. */
function buildTarget(target) {
  process.env.EXTENSION_TARGET = target;
  return new Promise((resolveBuild, rejectBuild) => {
    build({
      root: APP,
      configFile: resolve(APP, 'vite.config.ts'),
      mode,
      logLevel: watch ? 'warn' : 'info',
      build: watch ? { watch: {} } : {},
      plugins: [
        {
          name: 'flama:extension-reload',
          // Every rebuild after the first is a change Chrome has not seen.
          writeBundle() {
            reload?.changed(target);
          },
        },
      ],
    }).then((output) => {
      if (!watch) return resolveBuild();
      // A watcher settles on its first END; later ones are rebuilds.
      output.on('event', (event) => {
        if (event.type === 'END') resolveBuild();
        if (event.type === 'ERROR') console.error(event.error);
      });
    }, rejectBuild);
  });
}

// Sequential, not parallel: the pages build empties `dist/` first, and Vite
// reads `EXTENSION_TARGET` when it loads the config.
for (const target of TARGETS) {
  await buildTarget(target);
}

if (watch) {
  reload?.ready();
  console.log(
    `\n  Load apps/extension/dist from chrome://extensions ("Load unpacked") once.\n  It reloads itself on every rebuild (ws://localhost:${RELOAD_PORT}).\n`,
  );
}

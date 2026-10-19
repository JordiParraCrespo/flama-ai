/**
 * Development only: reload the extension when `pnpm dev` rebuilds it.
 *
 * The service worker connects to `scripts/reload-server.mjs` and reloads the
 * whole extension on its signal — pages, worker and the manifest itself. The
 * call site is guarded by `import.meta.env.DEV`, so a production build drops
 * this module entirely; `pnpm zip` refuses a build that still dials it.
 */

/** Must match `RELOAD_PORT` in scripts/reload-server.mjs. */
const RELOAD_URL = 'ws://localhost:35729';
const MAX_BACKOFF_MS = 10_000;

export function connectDevReload(): void {
  let backoff = 500;

  const connect = () => {
    const socket = new WebSocket(RELOAD_URL);
    socket.addEventListener('open', () => {
      backoff = 500;
    });
    socket.addEventListener('message', (event) => {
      if (event.data === 'reload') chrome.runtime.reload();
    });
    // The dev server restarted, or is not running yet: keep trying, quietly.
    socket.addEventListener('close', () => {
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    });
  };

  connect();
}

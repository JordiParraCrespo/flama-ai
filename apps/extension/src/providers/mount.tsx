import { i18nReady } from '@flama/frontend-web';
import { type ReactNode, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ExtensionRoot } from './extension-root';
import '@/styles/globals.css';

/**
 * Render an extension page. Each entrypoint calls this once with what it
 * shows; the providers, the stylesheet and the wait for the reader's catalog
 * are the same for all three.
 *
 * Rendering waits for the catalog and renders on either settlement: a catalog
 * that fails to load still shows the page, in the bundled default language
 * (see apps/web/src/main.tsx).
 */
export function mount(page: ReactNode): void {
  const container = document.getElementById('root');
  if (!container) throw new Error('mount: the page has no #root');
  const root = ReactDOM.createRoot(container);

  const render = () =>
    root.render(
      <StrictMode>
        <ExtensionRoot>{page}</ExtensionRoot>
      </StrictMode>,
    );

  i18nReady.then(render, render);
}

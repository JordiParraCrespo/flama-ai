import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider';
import { FlamaAppProvider } from '@/providers/flama-provider';
import { QueryProvider } from '@/providers/query-provider';
import { App } from './app';
import { i18nReady } from './lib/i18n';
import './styles/globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing application root');

const root = ReactDOM.createRoot(container);

const tree = (
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <FlamaAppProvider>
          <App />
        </FlamaAppProvider>
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
);

/**
 * Rendering waits for the reader's message catalog, which is now loaded rather
 * than bundled for every locale but the default. `finally` rather than `then`:
 * a catalog that fails to load must still render the app — i18next falls back
 * to the bundled default locale, and a blank page would be a far worse outcome
 * than English copy.
 *
 * For the default locale nothing is fetched, so this settles in a microtask.
 */
void i18nReady.finally(() => root.render(tree));

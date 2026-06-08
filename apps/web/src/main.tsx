import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider';
import { FlamaAppProvider } from '@/providers/flama-provider';
import { QueryProvider } from '@/providers/query-provider';
import { App } from './app';
import './lib/i18n';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <FlamaAppProvider>
          <App />
        </FlamaAppProvider>
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>,
);

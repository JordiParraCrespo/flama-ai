import { Toaster } from '@flama/design-system-web';
import { defaultQueryClientOptions, FlamaProvider } from '@flama/frontend-core/react';
import { ThemeProvider, useTheme } from '@flama/frontend-web';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useState } from 'react';
import { app } from '@/lib/flama';
import { queryPersistOptions } from '@/lib/query';

/** Sonner reads `next-themes`, which this app does not run: hand it the kit's theme. */
function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-center" />;
}

/**
 * What every extension page is wrapped in: the theme, the query cache, the
 * kernel and the one `Toaster`. Each page is its own document with its own
 * React root, so each gets its own copy — `mount.tsx` puts it there.
 */
export function ExtensionRoot({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: defaultQueryClientOptions(60_000) }),
  );

  return (
    <ThemeProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
        <FlamaProvider app={app}>
          {children}
          <ThemedToaster />
        </FlamaProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

import { FlamaProvider } from '@flama/frontend/react';
import type { ReactNode } from 'react';
import { app } from '@/lib/flama';

export function FlamaAppProvider({ children }: { children: ReactNode }) {
  return <FlamaProvider app={app}>{children}</FlamaProvider>;
}

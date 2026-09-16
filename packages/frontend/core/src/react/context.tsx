'use client';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { FlamaApp } from '../di/flama-app';

const FlamaContext = createContext<FlamaApp | null>(null);

export function FlamaProvider({ app, children }: { app: FlamaApp; children: ReactNode }) {
  return <FlamaContext.Provider value={app}>{children}</FlamaContext.Provider>;
}

export function useFlamaApp(): FlamaApp {
  const app = useContext(FlamaContext);
  if (!app) throw new Error('useFlamaApp must be used within <FlamaProvider>');
  return app;
}

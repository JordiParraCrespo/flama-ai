'use client';
import { useStore } from 'zustand';
import type { AuthState } from '../modules/auth/auth.state';
import { useFlamaApp } from './context';

export function useAuthState(): AuthState {
  const auth = useFlamaApp().auth;
  return useStore(auth.store);
}

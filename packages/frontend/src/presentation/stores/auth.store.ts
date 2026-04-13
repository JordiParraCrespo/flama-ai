import type { AppAbility } from '@flama/shared';
import { createStore } from 'zustand/vanilla';
import type { UserEntity } from '../../domain/entities/user.entity';

export interface AuthState {
  user: UserEntity | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ability: AppAbility | null;
}

export interface AuthActions {
  setUser: (user: UserEntity | null) => void;
  setLoading: (isLoading: boolean) => void;
  setAbility: (ability: AppAbility | null) => void;
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  ability: null,
};

export const createAuthStore = () =>
  createStore<AuthStore>((set) => ({
    ...initialState,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
    setAbility: (ability) => set({ ability }),
    reset: () => set(initialState),
  }));

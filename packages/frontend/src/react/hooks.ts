"use client";
import { useStore } from "zustand";
import type { AuthService } from "../modules/auth/auth.service";
import type { AuthState } from "../modules/auth/auth.state";
import { useFlamaApp } from "./context";

export function useAuth(): AuthService {
  return useFlamaApp().auth;
}

export function useAuthState(): AuthState {
  const auth = useFlamaApp().auth;
  return useStore(auth.store);
}

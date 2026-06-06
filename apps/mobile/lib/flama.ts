import { FlamaApp } from '@flama/frontend/di';
import { mobileAuthClient } from './auth-client';
import { ExpoSecureStoreService } from './storage';

export const app = FlamaApp.create({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
});

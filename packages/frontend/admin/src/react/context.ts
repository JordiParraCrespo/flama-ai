import { useFlamaApp } from '@flama/frontend-core/react';
import { AdminApp } from '../di/admin-app';

/** The product's services, from the same provider `useFlamaApp` reads. */
export function useAdminApp(): AdminApp {
  return AdminApp.for(useFlamaApp());
}

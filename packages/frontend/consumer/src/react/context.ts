import { useFlamaApp } from '@flama/frontend-core/react';
import { ConsumerApp } from '../di/consumer-app';

/** The product's services, from the same provider `useFlamaApp` reads. */
export function useConsumerApp(): ConsumerApp {
  return ConsumerApp.for(useFlamaApp());
}

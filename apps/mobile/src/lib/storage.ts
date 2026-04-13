import type { IStorageService } from '@flama/frontend';
import * as SecureStore from 'expo-secure-store';

export class SecureStorageService implements IStorageService {
  get(key: string): string | null {
    return SecureStore.getItem(key);
  }

  set(key: string, value: string): void {
    SecureStore.setItem(key, value);
  }

  remove(key: string): void {
    SecureStore.deleteItemAsync(key);
  }

  clear(): void {
    // SecureStore doesn't support clear, handled per-key
  }
}

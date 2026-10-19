import { useMutation } from '@tanstack/react-query';
import { send } from '@/runtime/messaging';

/**
 * Saving, removing and clearing clips, as mutations so a button can show it
 * is pending and an error has somewhere to land. Each asks the service
 * worker, the list's one writer; the list itself updates through `useClips`,
 * so there is no cache to touch on success.
 */
export function useSaveTab() {
  return useMutation({
    mutationFn: (tabId: number) => send('clips/save-tab', { tabId }),
  });
}

export function useRemoveClip() {
  return useMutation({
    mutationFn: (id: string) => send('clips/remove', { id }),
  });
}

export function useClearClips() {
  return useMutation({
    mutationFn: () => send('clips/clear'),
  });
}

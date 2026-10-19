import { authKeys } from '@flama/frontend-core/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listen } from '@/runtime/messaging';

/**
 * Keeps this page's idea of the session in step with the other extension
 * pages. Syncs with: `chrome.runtime` messages (`session/changed`).
 *
 * A sign-in or sign-out in one page changes the cookie every page shares, but
 * not what the others have already concluded from it. On the message, the
 * session is asked again: `useSessionRestore` re-reads it, flips the auth
 * store, and drops a cached answer that belonged to whoever was signed in
 * before.
 */
export function useSessionSync(): void {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      listen({
        'session/changed': async () => {
          await queryClient.invalidateQueries({ queryKey: authKeys.session() });
          return undefined;
        },
      }),
    [queryClient],
  );
}

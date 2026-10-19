import { useEffect, useState } from 'react';
import { shortcutFor } from '@/runtime/tabs';

/**
 * The keys bound to the manifest's two commands. Syncs with:
 * `chrome.commands`. Empty when the person unbound one.
 */
export function useShortcuts(): { open: string; save: string } {
  const [shortcuts, setShortcuts] = useState({ open: '', save: '' });

  useEffect(() => {
    let live = true;
    void Promise.all([shortcutFor('_execute_action'), shortcutFor('save-page')]).then(
      ([open, save]) => {
        if (live) setShortcuts({ open, save });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return shortcuts;
}

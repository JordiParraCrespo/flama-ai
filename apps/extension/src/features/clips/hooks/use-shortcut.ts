import { useEffect, useState } from 'react';
import { shortcutFor } from '@/runtime/tabs';

/**
 * The keys bound to one of the manifest's commands, as Chrome prints them.
 * Syncs with: `chrome.commands`. Read rather than hard-coded because the
 * person can rebind it, and a hint naming the wrong keys is worse than none:
 * `''` when unbound, and the caller says nothing.
 */
export function useShortcut(command: '_execute_action' | 'save-page'): string {
  const [shortcut, setShortcut] = useState('');

  useEffect(() => {
    let live = true;
    void shortcutFor(command).then((keys) => {
      if (live) setShortcut(keys);
    });
    return () => {
      live = false;
    };
  }, [command]);

  return shortcut;
}

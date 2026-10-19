import { useEffect, useState } from 'react';
import { activeTab } from '@/runtime/tabs';

export interface ActiveTab {
  id: number;
  title: string;
  url: string;
}

/**
 * The tab this page was opened over, read once. Syncs with: `chrome.tabs`.
 * The popup lives for one look at one tab, so it does not follow tab
 * switches; `null` is "no tab" (a window with none, a devtools window).
 * Deliberately not a query: a tab's address and title are not something to
 * persist in a cache on disk.
 */
export function useActiveTab(): ActiveTab | null | undefined {
  const [tab, setTab] = useState<ActiveTab | null>();

  useEffect(() => {
    let live = true;
    void activeTab().then((found) => {
      if (!live) return;
      setTab(
        found?.id === undefined
          ? null
          : { id: found.id, title: found.title ?? '', url: found.url ?? found.pendingUrl ?? '' },
      );
    });
    return () => {
      live = false;
    };
  }, []);

  return tab;
}

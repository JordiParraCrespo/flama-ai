import { useEffect, useState } from 'react';
import { currentWindowId } from '@/runtime/tabs';

/**
 * The id of the window this page is in, read once on mount. Syncs with:
 * `chrome.windows`. Read ahead because opening the side panel needs it inside
 * the click itself — an `await` in the click would cost the user gesture
 * Chrome asks for.
 */
export function useCurrentWindow(): number | undefined {
  const [windowId, setWindowId] = useState<number>();

  useEffect(() => {
    let live = true;
    void currentWindowId().then((id) => {
      if (live) setWindowId(id);
    });
    return () => {
      live = false;
    };
  }, []);

  return windowId;
}

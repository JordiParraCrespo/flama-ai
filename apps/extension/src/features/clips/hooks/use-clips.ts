import { useSyncExternalStore } from 'react';
import { type Clip, clipsItem } from '@/runtime/items';
import { storeOf } from '@/runtime/storage';

const clips = storeOf(clipsItem);

/**
 * The saved pages, live: `undefined` while the first read is in flight, then
 * every change from any context — a save from the shortcut lands in an open
 * side panel without a refresh. Not a query: the list is local state with a
 * change feed, not a server resource with a staleness rule.
 */
export function useClips(): Clip[] | undefined {
  return useSyncExternalStore(clips.subscribe, clips.getSnapshot);
}

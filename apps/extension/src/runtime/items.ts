import { z } from 'zod';
import { defineItem } from './storage';

/**
 * Everything the extension keeps in `chrome.storage`, in one table, beside
 * the one for what it says (`protocol.ts`). An item's comment names its single
 * writer; every other context reads it and watches it.
 *
 * The persisted query cache (`lib/query.ts`) and the kernel's own keys
 * (`ChromeStorageService`) live in the same area under prefixes of their own.
 */

export const clipSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  /** What the person had selected, or the link they right-clicked; may be empty. */
  quote: z.string(),
  /** ISO-8601 — a string, because `chrome.storage` stores JSON. */
  savedAt: z.string().datetime(),
});

export type Clip = z.infer<typeof clipSchema>;

/** Enough to be useful, few enough that `chrome.storage.local`'s quota never matters. */
export const MAX_CLIPS = 200;

/**
 * Saved pages, newest first. Local to this browser and never synced: a page
 * someone reads is theirs to keep, not to send anywhere by default.
 *
 * Writer: the service worker (`background/clips.ts`), for removals as well as
 * saves — a page asks it (`clips/remove`, `clips/clear`) rather than writing,
 * so every write goes through one queue and a save never races a removal.
 */
export const clipsItem = defineItem<Clip[]>({
  area: 'local',
  key: 'clips',
  schema: z.array(clipSchema),
  fallback: [],
});

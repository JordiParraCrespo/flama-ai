import { type Clip, clipsItem, MAX_CLIPS } from '@/runtime/items';

/**
 * The clips' one writer (see `clipsItem`). Pages ask for these through the
 * protocol; nothing else writes the list.
 */

/** The list with `clip` at the top: a page saved again moves up rather than repeating. */
export function withClip(list: readonly Clip[], clip: Clip): Clip[] {
  return [clip, ...list.filter((existing) => existing.url !== clip.url)].slice(0, MAX_CLIPS);
}

export async function addClip(
  input: Pick<Clip, 'url' | 'title' | 'quote'>,
  now: Date = new Date(),
): Promise<Clip> {
  const clip: Clip = { id: crypto.randomUUID(), ...input, savedAt: now.toISOString() };
  await clipsItem.update((list) => withClip(list, clip));
  return clip;
}

export async function removeClip(id: string): Promise<undefined> {
  await clipsItem.update((list) => list.filter((clip) => clip.id !== id));
  return undefined;
}

export async function clearClips(): Promise<undefined> {
  await clipsItem.set([]);
  return undefined;
}

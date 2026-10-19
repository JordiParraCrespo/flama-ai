import type { PageSnapshot } from '@/runtime/protocol';

/** Long enough for a paragraph, short enough that a whole article is not a "selection". */
export const MAX_QUOTE = 2_000;

/**
 * What a page shows, read when asked and not before. Only what the person can
 * see is read — the address, the title, their own selection and the summary
 * the page publishes about itself — never form fields or the DOM at large.
 */
export function readSnapshot(document: Document, selection: Selection | null): PageSnapshot {
  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ??
    '';

  return {
    url: document.URL,
    title: document.title,
    selection: (selection?.toString() ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE),
    description: description.trim(),
  };
}

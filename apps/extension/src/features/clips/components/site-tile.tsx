/**
 * A site's initial on a 32px tile — no favicon. Fetching one would tell a
 * favicon service, or the site, which pages this person keeps.
 */
export function SiteTile({ host }: { host: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-sunken text-sm font-medium text-ink-600 uppercase"
    >
      {host.charAt(0)}
    </span>
  );
}

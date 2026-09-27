import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { formatMediumDate, useLocale } from '@flama/frontend-web';

/** The tokens used most recently, newest first. */
export function RecentlyUsedTokens({ limit, tokens }: { limit: number; tokens: ApiTokenEntity[] }) {
  const locale = useLocale();
  const used = tokens
    .filter((token) => token.lastUsedAt !== null)
    .sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))
    .slice(0, limit);

  return (
    <ul className="flex flex-col">
      {used.map((token) => (
        <li key={token.id} className="flex items-center justify-between gap-2 py-1.5">
          <span className="truncate text-ink-900">{token.name}</span>
          <span className="text-ink-400">
            {token.lastUsedAt ? formatMediumDate(token.lastUsedAt, locale) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

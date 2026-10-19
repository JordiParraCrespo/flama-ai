import { IconButton } from '@flama/design-system-web';
import { X } from '@flama/design-system-web/icons';
import { formatRelativeTime } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { hostOf } from '@/features/clips/lib/clips';
import type { Clip } from '@/runtime/items';
import { SiteTile } from './site-tile';

/** One saved page. Pure: the list above owns the clock and the removal. */
export function ClipRow({
  clip,
  now,
  locale,
  onRemove,
  disabled,
}: {
  clip: Clip;
  /** The list's one clock (`useNow`), so every row ages together. */
  now: number;
  locale: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const host = hostOf(clip.url);
  const age =
    formatRelativeTime(new Date(clip.savedAt), locale, new Date(now)) ?? t('common.relative.now');

  return (
    <li className="flex gap-3 px-4 py-3">
      <SiteTile host={host} />
      <div className="min-w-0 flex-1">
        <a
          href={clip.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-sm font-medium text-ink-900 hover:underline"
        >
          {clip.title}
        </a>
        {clip.quote && (
          <blockquote className="mt-1 line-clamp-3 border-l-2 border-border-default pl-2 text-sm text-ink-600">
            {clip.quote}
          </blockquote>
        )}
        <p className="mt-1 truncate text-xs text-ink-400">
          {host} · {age}
        </p>
      </div>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={t('extension.clips.remove')}
        disabled={disabled}
        onClick={onRemove}
      >
        <X />
      </IconButton>
    </li>
  );
}

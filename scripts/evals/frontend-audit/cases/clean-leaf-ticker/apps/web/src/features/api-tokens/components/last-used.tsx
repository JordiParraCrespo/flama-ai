import { formatRelativeTime, useLocale } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { useNow } from '@/features/api-tokens/hooks/use-now';

/**
 * How long ago a token was last used. It owns its own clock so the row around
 * it, and the list around that, never re-render for it; `now` is passed in
 * rather than read, so the age moves with the clock.
 */
export function LastUsed({ at }: { at: Date | null }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow(at !== null);
  if (!at) return <span className="text-ink-400">{t('apiTokens.neverUsed')}</span>;

  return (
    <span className="text-ink-400">
      {formatRelativeTime(at, locale, now) ?? t('common.relative.now')}
    </span>
  );
}

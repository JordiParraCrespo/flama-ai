import { Button } from '@flama/design-system-web';
import { useLocale } from '@flama/frontend-web';
import { useNow } from '@flama/react-hooks';
import { useTranslation } from 'react-i18next';
import { ClipRow } from '@/features/clips/components/clip-row';
import { ClipsEmpty } from '@/features/clips/components/clips-empty';
import { useClearClips, useRemoveClip } from '@/features/clips/hooks/use-clip-actions';
import { useClips } from '@/features/clips/hooks/use-clips';
import { useShortcut } from '@/features/clips/hooks/use-shortcut';

/**
 * The saved pages, newest first, live. It owns the one clock every row's age
 * reads, so it is the only thing a minute's tick re-renders.
 */
export function ClipList() {
  const { t } = useTranslation();
  const clips = useClips();
  const now = useNow(60_000);
  const locale = useLocale();
  const shortcut = useShortcut('save-page');
  const remove = useRemoveClip();
  const clear = useClearClips();

  if (clips === undefined) return null;
  if (clips.length === 0) return <ClipsEmpty shortcut={shortcut} />;

  return (
    <section aria-labelledby="clips-title">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 id="clips-title" className="text-sm font-medium text-ink-900">
          {t('extension.clips.title')}{' '}
          <span className="font-normal text-ink-400">
            {t('extension.clips.count', { count: clips.length })}
          </span>
        </h2>
        <Button variant="ghost" size="sm" disabled={clear.isPending} onClick={() => clear.mutate()}>
          {t('extension.clips.clear')}
        </Button>
      </div>
      <ul className="divide-y divide-border-subtle">
        {clips.map((clip) => (
          <ClipRow
            key={clip.id}
            clip={clip}
            now={now}
            locale={locale}
            disabled={remove.isPending}
            onRemove={() => remove.mutate(clip.id)}
          />
        ))}
      </ul>
    </section>
  );
}

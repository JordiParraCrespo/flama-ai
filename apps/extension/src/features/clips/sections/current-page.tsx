import { Alert, AlertDescription, Button } from '@flama/design-system-web';
import { Check } from '@flama/design-system-web/icons';
import { useTranslation } from 'react-i18next';
import { SiteTile } from '@/features/clips/components/site-tile';
import { useActiveTab } from '@/features/clips/hooks/use-active-tab';
import { useSaveTab } from '@/features/clips/hooks/use-clip-actions';
import { useShortcut } from '@/features/clips/hooks/use-shortcut';
import { hostOf, saveErrorMessage } from '@/features/clips/lib/clips';
import { isScriptable } from '@/runtime/tabs';

/**
 * The popup's card for the tab it was opened over: what the page is, and the
 * one thing to do with it. The save runs in the service worker, so closing
 * the popup mid-save loses nothing.
 */
export function CurrentPage() {
  const { t } = useTranslation();
  const tab = useActiveTab();
  const save = useSaveTab();
  const shortcut = useShortcut('save-page');

  if (tab === undefined) return null;
  const readable = tab !== null && isScriptable(tab.url);

  return (
    <section className="flex flex-col gap-4 p-4" aria-label={t('extension.page.title')}>
      {tab && (
        <div className="flex items-center gap-3">
          <SiteTile host={hostOf(tab.url)} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{tab.title || tab.url}</p>
            <p className="truncate text-xs text-ink-600">{hostOf(tab.url)}</p>
          </div>
        </div>
      )}

      {!readable ? (
        <p className="rounded-md border border-border-subtle bg-surface-sunken px-3.5 py-3 text-sm text-ink-600">
          {t('extension.page.restricted')}
        </p>
      ) : (
        <>
          {save.isError && (
            <Alert variant="destructive">
              <AlertDescription>{saveErrorMessage(save.error, t)}</AlertDescription>
            </Alert>
          )}
          <Button
            className="h-10 w-full"
            disabled={save.isPending || save.isSuccess}
            onClick={() => save.mutate(tab.id)}
          >
            {save.isSuccess && <Check className="size-4" />}
            {save.isPending
              ? t('extension.page.saving')
              : save.isSuccess
                ? t('extension.page.saved')
                : t('extension.page.save')}
          </Button>
          {shortcut && (
            <p className="text-center text-xs text-ink-400">
              {t('extension.page.shortcutHint', { shortcut })}
            </p>
          )}
        </>
      )}
    </section>
  );
}
